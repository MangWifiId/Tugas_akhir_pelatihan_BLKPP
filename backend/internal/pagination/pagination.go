package pagination

import (
	"errors"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

const (
	DefaultLimit = 20
	MaxLimit     = 100
)

type Params struct {
	Page   int
	Limit  int
	Offset int
}

var ErrInvalid = errors.New("parameter page dan limit tidak valid")

// Parse membaca query string page (mulai dari 1) dan limit.
// Limit dibatasi maksimum MaxLimit agar query tidak mengambil
// seluruh tabel sekaligus.
func Parse(c *gin.Context) (Params, error) {
	page := 1
	limit := DefaultLimit

	if raw := c.Query("page"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 {
			return Params{}, ErrInvalid
		}
		page = value
	}

	if raw := c.Query("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 {
			return Params{}, ErrInvalid
		}
		if value > MaxLimit {
			value = MaxLimit
		}
		limit = value
	}

	// Cegah overflow saat menghitung offset.
	if page > math.MaxInt/limit {
		return Params{}, ErrInvalid
	}

	return Params{
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}, nil
}

// ParseOrAbort mengembalikan parameter pagination atau langsung
// mengirim response 400 jika parameternya tidak valid.
func ParseOrAbort(c *gin.Context) (Params, bool) {
	params, err := Parse(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return Params{}, false
	}

	return params, true
}

func Meta(params Params, total int64) gin.H {
	return gin.H{
		"page":  params.Page,
		"limit": params.Limit,
		"total": total,
	}
}
