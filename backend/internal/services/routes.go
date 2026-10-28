package services

import (
	"Tugas_Akhir/backend/internal/auth"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	// Owner dan admin: mengelola servis dan pembayaran.
	management := router.Group("")
	management.Use(auth.RequireRoles("owner", "admin"))

	management.POST("", handler.Create)
	management.POST("/:id/payments", handler.CreatePayment)

	// Owner, admin, dan mekanik: melihat dan mengerjakan servis.
	work := router.Group("")
	work.Use(auth.RequireRoles("owner", "admin", "mekanik"))

	work.GET("", handler.GetAll)
	work.GET("/:id", handler.GetByID)
	work.PUT("/:id", handler.Update)
	work.POST("/:id/parts", handler.AddPart)
}
