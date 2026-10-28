package sales

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"Tugas_Akhir/backend/internal/pagination"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateSaleRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Data penjualan tidak valid",
		})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Minimal harus ada satu barang",
		})
		return
	}

	// Ambil user_id dari JWT yang sudah divalidasi middleware.
	userIDValue, exists := c.Get("user_id")
	userID, ok := userIDValue.(int64)

	if !exists || !ok || userID <= 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Identitas pengguna tidak valid",
		})
		return
	}

	// Pastikan satu produk tidak dikirim berulang.
	seen := make(map[int64]bool)

	for _, item := range req.Items {
		if item.ProductID <= 0 || item.Quantity <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "ID produk dan jumlah harus lebih dari 0",
			})
			return
		}

		if seen[item.ProductID] {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Produk yang sama tidak boleh dimasukkan dua kali",
			})
			return
		}

		seen[item.ProductID] = true
	}

	if req.Notes != nil {
		notes := strings.TrimSpace(*req.Notes)
		req.Notes = &notes

		if notes == "" {
			req.Notes = nil
		}
	}

	sale, err := h.repo.Create(c.Request.Context(), req, userID)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidInput),
			errors.Is(err, ErrDuplicateProduct),
			errors.Is(err, ErrInvalidPrice),
			errors.Is(err, ErrSubtotalOverflow),
			errors.Is(err, ErrTotalOverflow):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})

		case errors.Is(err, ErrProductNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": err.Error(),
			})

		case errors.Is(err, ErrProductInactive),
			errors.Is(err, ErrInsufficientStock):
			c.JSON(http.StatusConflict, gin.H{
				"error": err.Error(),
			})

		default:
			log.Printf("gagal menyimpan penjualan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Gagal menyimpan transaksi penjualan",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Penjualan berhasil disimpan",
		"data":    sale,
	})
}

func (h *Handler) GetAll(c *gin.Context) {
	params, ok := pagination.ParseOrAbort(c)
	if !ok {
		return
	}

	salesList, total, err := h.repo.GetAll(
		c.Request.Context(),
		params.Limit,
		params.Offset,
	)
	if err != nil {
		log.Printf("gagal mengambil riwayat penjualan: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil riwayat penjualan",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": salesList,
		"meta": pagination.Meta(params, total),
	})
}

func (h *Handler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID penjualan tidak valid",
		})
		return
	}

	sale, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Penjualan tidak ditemukan",
			})
			return
		}

		log.Printf("gagal mengambil detail penjualan: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil detail penjualan",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": sale,
	})
}
