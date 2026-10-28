package stock

import "time"

type StockMovement struct {
	ID           int64     `json:"id"`
	ProductID    int64     `json:"product_id"`
	MovementType string    `json:"movement_type"`
	Quantity     int       `json:"quantity"`
	StockBefore  int       `json:"stock_before"`
	StockAfter   int       `json:"stock_after"`
	Notes        *string   `json:"notes"`
	CreatedAt    time.Time `json:"created_at"`
}

type CreateStockMovementRequest struct {
	ProductID           int64   `json:"product_id" binding:"required,gt=0"`
	MovementType        string  `json:"movement_type" binding:"required,oneof=in out adjustment"`
	Quantity            int     `json:"quantity" binding:"required,gt=0"`
	AdjustmentDirection string  `json:"adjustment_direction" binding:"omitempty,oneof=increase decrease"`
	Notes               *string `json:"notes"`
}
