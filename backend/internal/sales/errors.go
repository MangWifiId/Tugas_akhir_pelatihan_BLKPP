package sales

import "errors"

var (
	ErrInvalidInput      = errors.New("input penjualan tidak valid")
	ErrDuplicateProduct  = errors.New("produk yang sama tidak boleh dimasukkan dua kali")
	ErrProductNotFound   = errors.New("produk tidak ditemukan")
	ErrProductInactive   = errors.New("produk tidak aktif")
	ErrInsufficientStock = errors.New("stok tidak mencukupi")
	ErrInvalidPrice      = errors.New("harga produk tidak valid")
	ErrSubtotalOverflow  = errors.New("subtotal melebihi batas maksimum")
	ErrTotalOverflow     = errors.New("total penjualan melebihi batas maksimum")
)
