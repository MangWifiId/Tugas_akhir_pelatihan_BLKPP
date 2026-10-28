package stock

import "errors"

var (
	ErrProductNotFound   = errors.New("produk tidak ditemukan")
	ErrProductInactive   = errors.New("produk tidak aktif")
	ErrInsufficientStock = errors.New("stok tidak mencukupi")
	ErrInvalidQuantity   = errors.New("jumlah stok harus lebih dari 0")
	ErrInvalidStock      = errors.New("stok awal produk tidak valid")
	ErrInvalidDirection  = errors.New("arah koreksi harus increase atau decrease")
	ErrInvalidMovement   = errors.New("jenis pergerakan stok tidak valid")
	ErrStockOverflow     = errors.New("stok melebihi batas maksimum")
)
