package stock

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"Tugas_Akhir/backend/internal/pagination"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateStockMovementRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format atau data request tidak valid",
		})
		return
	}

	if req.MovementType == "adjustment" &&
		req.AdjustmentDirection == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "adjustment_direction wajib diisi untuk koreksi stok",
		})
		return
	}

	if req.MovementType != "adjustment" &&
		req.AdjustmentDirection != "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "adjustment_direction hanya digunakan untuk koreksi stok",
		})
		return
	}

	if req.Notes != nil {
		notes := strings.TrimSpace(*req.Notes)
		req.Notes = &notes
	}

	movement, err := h.repo.Create(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrProductNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})

		case errors.Is(err, ErrProductInactive),
			errors.Is(err, ErrInsufficientStock),
			errors.Is(err, ErrStockOverflow):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})

		case errors.Is(err, ErrInvalidQuantity),
			errors.Is(err, ErrInvalidStock),
			errors.Is(err, ErrInvalidDirection),
			errors.Is(err, ErrInvalidMovement):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})

		default:
			log.Printf("gagal memproses pergerakan stok: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Gagal memproses pergerakan stok",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Pergerakan stok berhasil dicatat",
		"data":    movement,
	})
}

func (h *Handler) GetMovements(c *gin.Context) {
	var productID int64

	idParam := c.Query("product_id")
	if idParam != "" {
		id, err := strconv.ParseInt(idParam, 10, 64)
		if err != nil || id <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "product_id harus berupa angka positif",
			})
			return
		}
		productID = id
	}

	params, ok := pagination.ParseOrAbort(c)
	if !ok {
		return
	}

	movements, total, err := h.repo.GetMovements(
		c.Request.Context(),
		productID,
		params.Limit,
		params.Offset,
	)
	if err != nil {
		log.Printf("gagal mengambil riwayat stok: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil riwayat stok",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": movements,
		"meta": pagination.Meta(params, total),
	})
}
