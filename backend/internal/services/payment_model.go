package services

import (
	"time"
)

type ServicePayment struct {
	ID            int64     `json:"id"`
	ServiceID     int64     `json:"service_id"`
	Amount        int64     `json:"amount"`
	PaymentMethod string    `json:"payment_method"`
	PaidAt        time.Time `json:"paid_at"`
	Notes         *string   `json:"notes"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreatePaymentRequest struct {
	Notes *string `json:"notes"`
}
