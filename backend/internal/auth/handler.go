package auth

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"Tugas_Akhir/backend/internal/pagination"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	repo      *Repository
	jwtSecret string
}

func NewHandler(repo *Repository, jwtSecret string) *Handler {
	return &Handler{
		repo:      repo,
		jwtSecret: jwtSecret,
	}
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Nama, email, dan password (8-72 karakter) harus diisi dengan benar",
		})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Nama tidak boleh kosong",
		})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword(
		[]byte(req.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		log.Printf("gagal memproses password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal memproses password",
		})
		return
	}

	user, err := h.repo.CreateUser(
		c.Request.Context(),
		req.Name,
		req.Email,
		string(passwordHash),
	)
	if err != nil {
		// PostgreSQL unique violation: email sudah terdaftar.
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Email sudah terdaftar",
			})
			return
		}

		log.Printf("gagal membuat pengguna: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal membuat pengguna",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Pengguna berhasil didaftarkan",
		"user":    user,
	})
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email dan password harus diisi dengan benar",
		})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	user, err := h.repo.FindUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Email atau password salah",
			})
			return
		}

		log.Printf("gagal memeriksa pengguna saat login: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal memeriksa pengguna",
		})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Akun tidak aktif",
		})
		return
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(req.Password),
	); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Email atau password salah",
		})
		return
	}

	token, err := GenerateToken(user, h.jwtSecret)
	if err != nil {
		log.Printf("gagal membuat token autentikasi: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal membuat token autentikasi",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login berhasil",
		"token":   token,
		"user":    user,
	})
}

// Me mengembalikan data pengguna yang sedang login berdasarkan token.
func (h *Handler) Me(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	userID, ok := userIDValue.(int64)
	if !exists || !ok || userID <= 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Identitas pengguna tidak valid",
		})
		return
	}

	user, err := h.repo.FindUserByID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Pengguna tidak ditemukan, silakan login ulang",
			})
			return
		}

		log.Printf("gagal mengambil data pengguna login: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil data pengguna",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": user,
	})
}

// ListUsers menampilkan daftar pengguna. Hanya untuk owner.
func (h *Handler) ListUsers(c *gin.Context) {
	params, ok := pagination.ParseOrAbort(c)
	if !ok {
		return
	}

	users, total, err := h.repo.GetAllUsers(
		c.Request.Context(),
		params.Limit,
		params.Offset,
	)
	if err != nil {
		log.Printf("gagal mengambil daftar pengguna: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil daftar pengguna",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": users,
		"meta": pagination.Meta(params, total),
	})
}

// UpdateRole mengubah role pengguna lain. Hanya untuk owner.
func (h *Handler) UpdateRole(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID pengguna tidak valid",
		})
		return
	}

	// Cegah owner mengubah role dirinya sendiri sehingga
	// sistem tidak kehilangan owner.
	if currentID, ok := c.Get("user_id"); ok {
		if uid, ok := currentID.(int64); ok && uid == id {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Anda tidak dapat mengubah role akun sendiri",
			})
			return
		}
	}

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Role harus owner, admin, mekanik, atau staff",
		})
		return
	}

	user, err := h.repo.UpdateRole(c.Request.Context(), id, req.Role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Pengguna tidak ditemukan",
			})
			return
		}

		log.Printf("gagal mengubah role pengguna: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengubah role pengguna",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Role pengguna berhasil diubah",
		"data":    user,
	})
}

// CreateUser membuat akun baru dengan role tertentu.
// Hanya boleh dipakai owner (dijaga middleware di routes).
func (h *Handler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Nama, email, password (8-72 karakter), dan role harus diisi dengan benar",
		})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Nama tidak boleh kosong",
		})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword(
		[]byte(req.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		log.Printf("gagal memproses password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal memproses password",
		})
		return
	}

	user, err := h.repo.CreateUserWithRole(
		c.Request.Context(),
		req.Name,
		req.Email,
		string(passwordHash),
		req.Role,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Email sudah terdaftar",
			})
			return
		}

		log.Printf("gagal membuat pengguna: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal membuat pengguna",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Pengguna berhasil dibuat",
		"data":    user,
	})
}
