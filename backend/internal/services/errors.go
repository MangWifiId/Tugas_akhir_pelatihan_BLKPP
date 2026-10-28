package services

import "errors"

var (
	ErrServiceNotFound = errors.New("data servis tidak ditemukan")
	ErrProductNotFound = errors.New("produk tidak ditemukan")

	ErrInvalidStatus = errors.New("status servis tidak valid")
	ErrTotalOverflow = errors.New("total biaya servis melebihi batas maksimum")

	ErrServiceNotCompleted = errors.New("servis harus selesai sebelum pembayaran")
	ErrServiceAlreadyPaid  = errors.New("servis sudah dibayar")
	ErrInvalidServiceCost  = errors.New("total biaya servis harus lebih dari 0")

	ErrServiceFinalized = errors.New("servis yang sudah selesai tidak dapat diubah")
	ErrServiceCancelled = errors.New("servis yang dibatalkan tidak dapat diubah")
	ErrServicePaid      = errors.New("servis yang sudah dibayar tidak dapat diubah")
	ErrPaymentEndpoint  = errors.New("gunakan endpoint pembayaran untuk mengonfirmasi pembayaran")

	ErrPartInvalidInput  = errors.New("produk dan jumlah spare part harus valid")
	ErrInsufficientStock = errors.New("stok tidak cukup")
)
