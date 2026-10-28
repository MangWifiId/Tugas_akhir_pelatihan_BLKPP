package products

import "errors"

var (
	ErrNotFound  = errors.New("produk tidak ditemukan")
	ErrSKUExists = errors.New("SKU sudah digunakan")
)
