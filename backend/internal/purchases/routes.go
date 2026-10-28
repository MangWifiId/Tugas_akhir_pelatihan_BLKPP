package purchases

import "github.com/gin-gonic/gin"

func RegisterRoutes(routes *gin.RouterGroup, handler *Handler) {
	routes.POST("", handler.Create)
	routes.GET("", handler.GetAll)
	routes.GET("/:id", handler.GetByID)
}
