package sales

import (
	"Tugas_Akhir/backend/internal/auth"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	// Penjualan langsung hanya dapat diakses owner dan admin.
	router.Use(auth.RequireRoles("owner", "admin"))

	router.POST("", handler.Create)
	router.GET("", handler.GetAll)
	router.GET("/:id", handler.GetByID)
}
