package dashboard

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Summary(c *gin.Context) {
	summary, err := h.repo.Summary(c.Request.Context())
	if err != nil {
		log.Printf("gagal mengambil ringkasan dashboard: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil ringkasan dashboard",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": summary,
	})
}
