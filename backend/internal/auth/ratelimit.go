package auth

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimitEntry struct {
	count   int
	resetAt time.Time
}

type rateLimiter struct {
	mu      sync.Mutex
	entries map[string]rateLimitEntry
	limit   int
	window  time.Duration
	now     func() time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		entries: make(map[string]rateLimitEntry),
		limit:   limit,
		window:  window,
		now:     time.Now,
	}
}

// allow mengembalikan apakah request masih boleh dilanjutkan dan
// sisa waktu tunggu jika sudah terkena limit.
func (l *rateLimiter) allow(key string) (bool, time.Duration) {
	now := l.now()

	l.mu.Lock()
	defer l.mu.Unlock()

	entry, exists := l.entries[key]
	if !exists || !now.Before(entry.resetAt) {
		l.entries[key] = rateLimitEntry{
			count:   1,
			resetAt: now.Add(l.window),
		}
		l.cleanupLocked(now)
		return true, 0
	}

	if entry.count >= l.limit {
		return false, entry.resetAt.Sub(now)
	}

	entry.count++
	l.entries[key] = entry

	return true, 0
}

// cleanupLocked membuang entri kedaluwarsa ketika map sudah cukup
// besar, sehingga memori tidak tumbuh tanpa batas.
func (l *rateLimiter) cleanupLocked(now time.Time) {
	if len(l.entries) < 1024 {
		return
	}

	for key, entry := range l.entries {
		if !now.Before(entry.resetAt) {
			delete(l.entries, key)
		}
	}
}

func (l *rateLimiter) middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		allowed, retryAfter := l.allow(c.ClientIP())
		if !allowed {
			seconds := int(retryAfter.Seconds())
			if seconds < 1 {
				seconds = 1
			}

			c.Header("Retry-After", strconv.Itoa(seconds))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Terlalu banyak percobaan. Silakan coba lagi nanti.",
			})
			return
		}

		c.Next()
	}
}

var (
	loginLimiter    = newRateLimiter(10, time.Minute)
	registerLimiter = newRateLimiter(5, time.Minute)
)

// LoginRateLimit membatasi percobaan login per alamat IP.
func LoginRateLimit() gin.HandlerFunc {
	return loginLimiter.middleware()
}

// RegisterRateLimit membatasi percobaan registrasi per alamat IP.
func RegisterRateLimit() gin.HandlerFunc {
	return registerLimiter.middleware()
}
