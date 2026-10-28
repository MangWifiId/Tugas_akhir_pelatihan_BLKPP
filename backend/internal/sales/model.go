package sales

import "time"

type Sale struct {
	ID            int64      `json:"id"`
	UserID        *int64     `json:"user_id"`
	InvoiceNumber string     `json:"invoice_number"`
	Subtotal      int64      `json:"subtotal"`
	Discount      int64      `json:"discount"`
	Total         int64      `json:"total"`
	PaymentMethod string     `json:"payment_method"`
	Status        string     `json:"status"`
	Notes         *string    `json:"notes"`
	Items         []SaleItem `json:"items,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type SaleItem struct {
	ID          int64  `json:"id"`
	SaleID      int64  `json:"sale_id"`
	ProductID   int64  `json:"product_id"`
	ProductName string `json:"product_name"`
	Quantity    int    `json:"quantity"`
	UnitPrice   int64  `json:"unit_price"`
	Subtotal    int64  `json:"subtotal"`
}

type CreateSaleRequest struct {
	Items []CreateSaleItemRequest `json:"items" binding:"required,dive"`
	Notes *string                 `json:"notes"`
}

type CreateSaleItemRequest struct {
	ProductID int64 `json:"product_id" binding:"required,gt=0"`
	Quantity  int   `json:"quantity" binding:"required,gt=0"`
}
