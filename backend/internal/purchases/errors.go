package purchases

import "errors"

var (
	ErrInvalidItem         = errors.New("detail pembelian tidak valid")
	ErrDuplicateProduct    = errors.New("produk yang sama tidak boleh muncul dua kali")
	ErrAmountTooLarge      = errors.New("nilai pembelian terlalu besar")
	ErrProductNotFound     = errors.New("produk tidak ditemukan")
	ErrProductInactive     = errors.New("produk tidak aktif")
	ErrStockTooLarge       = errors.New("jumlah stok terlalu besar")
	ErrInvoiceNumberExists = errors.New("nomor faktur sudah digunakan")
)
