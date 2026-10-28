package products

import (
	"Tugas_Akhir/backend/internal/auth"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	// Membaca produk: semua pengguna yang sudah login
	// (owner, admin, mekanik, staff). Mekanik membutuhkan ini
	// untuk memilih sparepart saat mengerjakan servis.
	router.GET("", handler.GetAll)
	router.GET("/:id", handler.GetByID)

	// Mengubah data produk: hanya owner dan admin.
	write := router.Group("")
	write.Use(auth.RequireRoles("owner", "admin"))

	write.POST("", handler.Create)
	write.PUT("/:id", handler.Update)
	write.DELETE("/:id", handler.Delete)
}
