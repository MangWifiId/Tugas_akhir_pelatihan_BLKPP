package services

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

// POST /api/services/
func (h *Handler) Create(c *gin.Context) {
	var req CreateServiceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Data servis tidak valid",
		})
		return
	}

	req.CustomerName = strings.TrimSpace(req.CustomerName)
	req.VehiclePlate = strings.TrimSpace(req.VehiclePlate)
	req.Complaint = strings.TrimSpace(req.Complaint)

	if req.CustomerName == "" ||
		req.VehiclePlate == "" ||
		req.Complaint == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Nama pelanggan, nomor kendaraan, dan keluhan wajib diisi",
		})
		return
	}

	service, err := h.repo.Create(c.Request.Context(), req)
	if err != nil {
		log.Printf("gagal membuat data servis: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal membuat data servis",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Data servis berhasil dibuat",
		"data":    service,
	})
}

// GET /api/services/
func (h *Handler) GetAll(c *gin.Context) {
	params, ok := pagination.ParseOrAbort(c)
	if !ok {
		return
	}

	search := strings.TrimSpace(c.Query("search"))
	status := strings.TrimSpace(c.Query("status"))

	switch status {
	case "", "pending", "in_progress", "completed", "cancelled":
		// Status valid.
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "status servis tidak valid",
		})
		return
	}

	services, total, err := h.repo.GetAll(
		c.Request.Context(),
		search,
		status,
		params.Limit,
		params.Offset,
	)
	if err != nil {
		log.Printf("gagal mengambil data servis: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil data servis",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": services,
		"meta": pagination.Meta(params, total),
	})
}

// GET /api/services/:id
func (h *Handler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID servis tidak valid",
		})
		return
	}

	service, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Data servis tidak ditemukan",
			})
			return
		}

		log.Printf("gagal mengambil detail servis: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil detail servis",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": service,
	})
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID servis tidak valid",
		})
		return
	}

	var req UpdateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Data pembaruan servis tidak valid",
		})
		return
	}

	// Servis harus selesai sebelum pembayaran dikonfirmasi.
	if req.PaymentStatus == "paid" && req.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Servis harus selesai sebelum pembayaran dikonfirmasi",
		})
		return
	}

	service, err := h.repo.Update(c.Request.Context(), id, req)

	if err != nil {
		switch {
		case errors.Is(err, ErrServiceNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": err.Error(),
			})

		case errors.Is(err, ErrServiceFinalized),
			errors.Is(err, ErrServiceCancelled),
			errors.Is(err, ErrServicePaid),
			errors.Is(err, ErrPaymentEndpoint):
			c.JSON(http.StatusConflict, gin.H{
				"error": err.Error(),
			})

		case errors.Is(err, ErrInvalidStatus),
			errors.Is(err, ErrTotalOverflow):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})

		default:
			log.Printf("gagal memperbarui data servis: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Gagal memperbarui data servis",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data servis berhasil diperbarui",
		"data":    service,
	})
}

func (h *Handler) AddPart(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID servis tidak valid",
		})
		return
	}

	var req AddServicePartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Data spare part tidak valid",
		})
		return
	}

	part, err := h.repo.AddPart(
		c.Request.Context(),
		id,
		req,
	)
	if err != nil {
		switch {
		case errors.Is(err, ErrServiceNotFound),
			errors.Is(err, ErrProductNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": err.Error(),
			})

		case errors.Is(err, ErrPartInvalidInput):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})

		case errors.Is(err, ErrServiceFinalized),
			errors.Is(err, ErrServiceCancelled),
			errors.Is(err, ErrServicePaid),
			errors.Is(err, ErrInsufficientStock):
			c.JSON(http.StatusConflict, gin.H{
				"error": err.Error(),
			})

		default:
			log.Printf("gagal menambahkan spare part: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Gagal menambahkan spare part ke servis",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Spare part berhasil ditambahkan ke servis",
		"data":    part,
	})
}

func (h *Handler) CreatePayment(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID servis tidak valid",
		})
		return
	}

	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Data pembayaran tidak valid",
		})
		return
	}

	payment, err := h.repo.CreatePayment(
		c.Request.Context(),
		id,
		req,
	)
	if err != nil {
		switch {
		case errors.Is(err, ErrServiceNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": err.Error(),
			})

		case errors.Is(err, ErrServiceNotCompleted),
			errors.Is(err, ErrServiceAlreadyPaid),
			errors.Is(err, ErrInvalidServiceCost):
			c.JSON(http.StatusConflict, gin.H{
				"error": err.Error(),
			})

		default:
			log.Printf("gagal memproses pembayaran servis: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Gagal memproses pembayaran servis",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Pembayaran servis berhasil dicatat",
		"data":    payment,
	})
}
