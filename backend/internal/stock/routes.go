package stock

import (
	"Tugas_Akhir/backend/internal/auth"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	// Pergerakan stok langsung hanya dapat dikelola owner dan admin.
	router.Use(auth.RequireRoles("owner", "admin"))

	router.POST("/movements", handler.Create)
	router.GET("/movements", handler.GetMovements)
}
