package stock

import (
	"errors"
	"testing"
)

func TestComputeStockAfter(t *testing.T) {
	tests := []struct {
		name        string
		movement    string
		direction   string
		quantity    int
		stockBefore int
		want        int
		wantErr     error
	}{
		{name: "stok masuk", movement: "in", quantity: 5, stockBefore: 10, want: 15},
		{name: "stok keluar cukup", movement: "out", quantity: 4, stockBefore: 10, want: 6},
		{name: "stok keluar tidak cukup", movement: "out", quantity: 11, stockBefore: 10, wantErr: ErrInsufficientStock},
		{name: "koreksi naik", movement: "adjustment", direction: "increase", quantity: 3, stockBefore: 7, want: 10},
		{name: "koreksi turun", movement: "adjustment", direction: "decrease", quantity: 3, stockBefore: 7, want: 4},
		{name: "koreksi turun melebihi stok", movement: "adjustment", direction: "decrease", quantity: 8, stockBefore: 7, wantErr: ErrInsufficientStock},
		{name: "koreksi tanpa arah", movement: "adjustment", quantity: 1, stockBefore: 7, wantErr: ErrInvalidDirection},
		{name: "jenis pergerakan tidak valid", movement: "transfer", quantity: 1, stockBefore: 7, wantErr: ErrInvalidMovement},
		{name: "jumlah nol", movement: "in", quantity: 0, stockBefore: 7, wantErr: ErrInvalidQuantity},
		{name: "jumlah negatif", movement: "out", quantity: -1, stockBefore: 7, wantErr: ErrInvalidQuantity},
		{name: "stok awal negatif", movement: "in", quantity: 1, stockBefore: -1, wantErr: ErrInvalidStock},
		{name: "stok masuk melebihi batas", movement: "in", quantity: 1, stockBefore: int(maxStock), wantErr: ErrStockOverflow},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := computeStockAfter(
				test.movement,
				test.direction,
				test.quantity,
				test.stockBefore,
			)

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
				t.Fatalf("stok akhir = %d, ingin %d", got, test.want)
			}
		})
	}
}
