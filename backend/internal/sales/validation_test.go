package sales

import (
	"errors"
	"math"
	"testing"
)

func TestValidateSaleRequest(t *testing.T) {
	validItems := []CreateSaleItemRequest{
		{ProductID: 1, Quantity: 2},
		{ProductID: 2, Quantity: 1},
	}

	tests := []struct {
		name    string
		userID  int64
		items   []CreateSaleItemRequest
		wantErr error
	}{
		{name: "valid", userID: 1, items: validItems},
		{name: "tanpa item", userID: 1, items: nil, wantErr: ErrInvalidInput},
		{name: "user tidak valid", userID: 0, items: validItems, wantErr: ErrInvalidInput},
		{
			name:    "produk tidak valid",
			userID:  1,
			items:   []CreateSaleItemRequest{{ProductID: 0, Quantity: 1}},
			wantErr: ErrInvalidInput,
		},
		{
			name:    "jumlah tidak valid",
			userID:  1,
			items:   []CreateSaleItemRequest{{ProductID: 1, Quantity: 0}},
			wantErr: ErrInvalidInput,
		},
		{
			name:   "produk duplikat",
			userID: 1,
			items: []CreateSaleItemRequest{
				{ProductID: 1, Quantity: 1},
				{ProductID: 1, Quantity: 2},
			},
			wantErr: ErrDuplicateProduct,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateSaleRequest(test.userID, test.items)

			if test.wantErr == nil {
				if err != nil {
					t.Fatalf("error tidak terduga: %v", err)
				}
				return
			}

			if !errors.Is(err, test.wantErr) {
				t.Fatalf("error = %v, ingin %v", err, test.wantErr)
			}
		})
	}
}

func TestSaleItemSubtotal(t *testing.T) {
	tests := []struct {
		name     string
		price    int64
		quantity int
		want     int64
		wantErr  error
	}{
		{name: "normal", price: 15000, quantity: 3, want: 45000},
		{name: "harga nol", price: 0, quantity: 5, want: 0},
		{name: "harga negatif", price: -1, quantity: 1, wantErr: ErrInvalidPrice},
		{name: "jumlah nol", price: 1000, quantity: 0, wantErr: ErrInvalidInput},
		{name: "maksimum", price: math.MaxInt64, quantity: 1, want: math.MaxInt64},
		{
			name:     "overflow subtotal",
			price:    math.MaxInt64 / 2,
			quantity: 3,
			wantErr:  ErrSubtotalOverflow,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := saleItemSubtotal(test.price, test.quantity)

			if test.wantErr != nil {
				if !errors.Is(err, test.wantErr) {
					t.Fatalf("error = %v, ingin %v", err, test.wantErr)
				}
				return
			}

			if err != nil {
				t.Fatalf("error tidak terduga: %v", err)
			}

			if got != test.want {
				t.Fatalf("subtotal = %d, ingin %d", got, test.want)
			}
		})
	}
}

func TestAddSaleSubtotal(t *testing.T) {
	tests := []struct {
		name    string
		current int64
		line    int64
		want    int64
		wantErr error
	}{
		{name: "normal", current: 1000, line: 2000, want: 3000},
		{name: "nol", current: 0, line: 0, want: 0},
		{
			name:    "overflow total",
			current: 1,
			line:    math.MaxInt64,
			wantErr: ErrTotalOverflow,
		},
		{
			name:    "baris negatif",
			current: 1,
			line:    -1,
			wantErr: ErrTotalOverflow,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := addSaleSubtotal(test.current, test.line)

			if test.wantErr != nil {
				if !errors.Is(err, test.wantErr) {
					t.Fatalf("error = %v, ingin %v", err, test.wantErr)
				}
				return
			}

			if err != nil {
				t.Fatalf("error tidak terduga: %v", err)
			}

			if got != test.want {
				t.Fatalf("total = %d, ingin %d", got, test.want)
			}
		})
	}
}

func TestSortSaleItems(t *testing.T) {
	items := []CreateSaleItemRequest{
		{ProductID: 3, Quantity: 1},
		{ProductID: 1, Quantity: 1},
		{ProductID: 2, Quantity: 1},
	}

	sortSaleItems(items)

	for index, item := range items {
		want := int64(index + 1)
		if item.ProductID != want {
			t.Fatalf("item[%d].ProductID = %d, ingin %d", index, item.ProductID, want)
		}
	}
}
