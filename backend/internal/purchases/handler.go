package purchases

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
	var req CreatePurchaseRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format data pembelian tidak valid",
		})
		return
	}

	req.InvoiceNumber = strings.TrimSpace(req.InvoiceNumber)
	if req.InvoiceNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Nomor faktur wajib diisi",
		})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Minimal satu item pembelian harus diisi",
		})
		return
	}

	purchase, err := h.repo.Create(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvoiceNumberExists):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})

		case errors.Is(err, ErrProductNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})

		case errors.Is(err, ErrProductInactive):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})

		case errors.Is(err, ErrInvalidItem),
			errors.Is(err, ErrDuplicateProduct),
			errors.Is(err, ErrAmountTooLarge),
			errors.Is(err, ErrStockTooLarge):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})

		default:
			log.Printf("gagal menyimpan pembelian: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Gagal menyimpan pembelian",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Pembelian berhasil disimpan",
		"data":    purchase,
	})
}

func (h *Handler) GetAll(c *gin.Context) {
	params, ok := pagination.ParseOrAbort(c)
	if !ok {
		return
	}

	purchases, total, err := h.repo.GetAll(
		c.Request.Context(),
		params.Limit,
		params.Offset,
	)
	if err != nil {
		log.Printf("gagal mengambil riwayat pembelian: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil riwayat pembelian",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": purchases,
		"meta": pagination.Meta(params, total),
	})
}

func (h *Handler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID pembelian tidak valid",
		})
		return
	}

	purchase, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Pembelian tidak ditemukan",
			})
			return
		}

		log.Printf("gagal mengambil detail pembelian: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil detail pembelian",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": purchase,
	})
}
