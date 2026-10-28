package purchases

import "time"

type Purchase struct {
	ID            int64          `json:"id"`
	InvoiceNumber string         `json:"invoice_number"`
	SupplierName  *string        `json:"supplier_name"`
	Subtotal      int64          `json:"subtotal"`
	Notes         *string        `json:"notes"`
	Items         []PurchaseItem `json:"items,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

type PurchaseItem struct {
	ID          int64     `json:"id"`
	PurchaseID  int64     `json:"purchase_id"`
	ProductID   int64     `json:"product_id"`
	ProductName string    `json:"product_name,omitempty"`
	Quantity    int       `json:"quantity"`
	UnitCost    int64     `json:"unit_cost"`
	Subtotal    int64     `json:"subtotal"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreatePurchaseRequest struct {
	InvoiceNumber string               `json:"invoice_number" binding:"required,max=50"`
	SupplierName  *string              `json:"supplier_name" binding:"omitempty,max=150"`
	Notes         *string              `json:"notes"`
	Items         []CreatePurchaseItem `json:"items" binding:"required,min=1,dive"`
}

type CreatePurchaseItem struct {
	ProductID int64 `json:"product_id" binding:"required,gt=0"`
	Quantity  int   `json:"quantity" binding:"required,gt=0"`
	UnitCost  int64 `json:"unit_cost" binding:"gt=0"`
}
