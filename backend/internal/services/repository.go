package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Create membuat data servis baru.
func (r *Repository) Create(
	ctx context.Context,
	req CreateServiceRequest,
) (Service, error) {
	var service Service

	service.ServiceNumber = fmt.Sprintf(
		"SVC-%s",
		time.Now().Format("20060102150405.000000"),
	)

	err := r.db.QueryRow(ctx, `
		INSERT INTO services (
			service_number,
			customer_name,
			customer_phone,
			vehicle_plate,
			vehicle_brand,
			complaint,
			mechanic_name,
			notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING
			id,
			service_number,
			customer_name,
			customer_phone,
			vehicle_plate,
			vehicle_brand,
			complaint,
			diagnosis,
			mechanic_name,
			labor_cost,
			parts_cost,
			total_cost,
			status,
			payment_status,
			notes,
			created_at,
			updated_at
	`,
		service.ServiceNumber,
		req.CustomerName,
		req.CustomerPhone,
		req.VehiclePlate,
		req.VehicleBrand,
		req.Complaint,
		req.MechanicName,
		req.Notes,
	).Scan(
		&service.ID,
		&service.ServiceNumber,
		&service.CustomerName,
		&service.CustomerPhone,
		&service.VehiclePlate,
		&service.VehicleBrand,
		&service.Complaint,
		&service.Diagnosis,
		&service.MechanicName,
		&service.LaborCost,
		&service.PartsCost,
		&service.TotalCost,
		&service.Status,
		&service.PaymentStatus,
		&service.Notes,
		&service.CreatedAt,
		&service.UpdatedAt,
	)
	if err != nil {
		return Service{}, err
	}

	return service, nil
}

// GetAll mengambil data servis dengan pagination dan filter opsional.
func (r *Repository) GetAll(
	ctx context.Context,
	search string,
	status string,
	limit int,
	offset int,
) ([]Service, int64, error) {
	conditions := make([]string, 0, 2)
	args := make([]any, 0, 4)

	if search != "" {
		args = append(args, "%"+search+"%")
		conditions = append(conditions, fmt.Sprintf(
			`(service_number ILIKE $%d OR customer_name ILIKE $%d OR vehicle_plate ILIKE $%d)`,
			len(args), len(args), len(args),
		))
	}

	if status != "" {
		args = append(args, status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}

	where := ""
	if len(conditions) > 0 {
		where = " WHERE " + strings.Join(conditions, " AND ")
	}

	var total int64
	if err := r.db.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM services`+where,
		args...,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("gagal menghitung data servis: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT
			id,
			service_number,
			customer_name,
			customer_phone,
			vehicle_plate,
			vehicle_brand,
			complaint,
			diagnosis,
			mechanic_name,
			labor_cost,
			parts_cost,
			total_cost,
			status,
			payment_status,
			notes,
			created_at,
			updated_at
		FROM services
		%s
		ORDER BY created_at DESC, id DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)+1, len(args)+2)

	rows, err := r.db.Query(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("gagal mengambil data servis: %w", err)
	}
	defer rows.Close()

	result := make([]Service, 0)

	for rows.Next() {
		var service Service

		err := rows.Scan(
			&service.ID,
			&service.ServiceNumber,
			&service.CustomerName,
			&service.CustomerPhone,
			&service.VehiclePlate,
			&service.VehicleBrand,
			&service.Complaint,
			&service.Diagnosis,
			&service.MechanicName,
			&service.LaborCost,
			&service.PartsCost,
			&service.TotalCost,
			&service.Status,
			&service.PaymentStatus,
			&service.Notes,
			&service.CreatedAt,
			&service.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("gagal membaca data servis: %w", err)
		}

		result = append(result, service)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("gagal membaca hasil query servis: %w", err)
	}

	return result, total, nil
}

// GetByID mengambil satu servis berdasarkan ID.
func (r *Repository) GetByID(
	ctx context.Context,
	id int64,
) (Service, error) {
	var service Service

	err := r.db.QueryRow(ctx, `
		SELECT
			id,
			service_number,
			customer_name,
			customer_phone,
			vehicle_plate,
			vehicle_brand,
			complaint,
			diagnosis,
			mechanic_name,
			labor_cost,
			parts_cost,
			total_cost,
			status,
			payment_status,
			notes,
			created_at,
			updated_at
		FROM services
		WHERE id = $1
	`, id).Scan(
		&service.ID,
		&service.ServiceNumber,
		&service.CustomerName,
		&service.CustomerPhone,
		&service.VehiclePlate,
		&service.VehicleBrand,
		&service.Complaint,
		&service.Diagnosis,
		&service.MechanicName,
		&service.LaborCost,
		&service.PartsCost,
		&service.TotalCost,
		&service.Status,
		&service.PaymentStatus,
		&service.Notes,
		&service.CreatedAt,
		&service.UpdatedAt,
	)
	if err != nil {
		return Service{}, err
	}

	parts, err := r.serviceParts(ctx, service.ID)
	if err != nil {
		return Service{}, err
	}
	service.Parts = parts

	payments, err := r.servicePayments(ctx, service.ID)
	if err != nil {
		return Service{}, err
	}
	service.Payments = payments

	return service, nil
}

// serviceParts mengambil daftar spare part yang dipakai pada servis.
func (r *Repository) serviceParts(
	ctx context.Context,
	serviceID int64,
) ([]ServicePart, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			sp.id,
			sp.service_id,
			sp.product_id,
			COALESCE(p.name, ''),
			sp.quantity,
			sp.unit_cost,
			sp.unit_price,
			sp.subtotal,
			sp.created_at
		FROM service_parts sp
		LEFT JOIN products p ON p.id = sp.product_id
		WHERE sp.service_id = $1
		ORDER BY sp.id
	`, serviceID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil spare part servis: %w", err)
	}
	defer rows.Close()

	parts := make([]ServicePart, 0)

	for rows.Next() {
		var part ServicePart

		if err := rows.Scan(
			&part.ID,
			&part.ServiceID,
			&part.ProductID,
			&part.ProductName,
			&part.Quantity,
			&part.UnitCost,
			&part.UnitPrice,
			&part.Subtotal,
			&part.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("gagal membaca spare part servis: %w", err)
		}

		parts = append(parts, part)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("gagal membaca hasil spare part servis: %w", err)
	}

	return parts, nil
}

// servicePayments mengambil riwayat pembayaran servis.
func (r *Repository) servicePayments(
	ctx context.Context,
	serviceID int64,
) ([]ServicePayment, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, service_id, amount, payment_method,
		       paid_at, notes, created_at
		FROM service_payments
		WHERE service_id = $1
		ORDER BY paid_at, id
	`, serviceID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil pembayaran servis: %w", err)
	}
	defer rows.Close()

	payments := make([]ServicePayment, 0)

	for rows.Next() {
		var payment ServicePayment

		if err := rows.Scan(
			&payment.ID,
			&payment.ServiceID,
			&payment.Amount,
			&payment.PaymentMethod,
			&payment.PaidAt,
			&payment.Notes,
			&payment.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("gagal membaca pembayaran servis: %w", err)
		}

		payments = append(payments, payment)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("gagal membaca hasil pembayaran servis: %w", err)
	}

	return payments, nil
}

// Update memperbarui informasi servis tanpa mencatat pembayaran langsung.
func (r *Repository) Update(
	ctx context.Context,
	id int64,
	req UpdateServiceRequest,
) (Service, error) {
	var service Service

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Service{}, err
	}
	defer tx.Rollback(ctx)

	var currentStatus string
	var currentPaymentStatus string
	var currentPartsCost int64

	err = tx.QueryRow(ctx, `
		SELECT status, payment_status, parts_cost
		FROM services
		WHERE id = $1
		FOR UPDATE
	`, id).Scan(&currentStatus, &currentPaymentStatus, &currentPartsCost)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Service{}, ErrServiceNotFound
		}

		return Service{}, fmt.Errorf("gagal membaca data servis: %w", err)
	}

	switch req.Status {
	case "pending", "in_progress", "completed", "cancelled":
		// Status valid.
	default:
		return Service{}, ErrInvalidStatus
	}
	// Servis selesai atau sudah dibayar menjadi catatan final. Perubahan
	// biaya/status/catatan harus dilakukan lewat proses koreksi terpisah
	// (belum disediakan), bukan dengan menimpa transaksi yang sudah final.
	if currentStatus == "completed" {
		return Service{}, ErrServiceFinalized
	}
	if currentStatus == "cancelled" {
		return Service{}, ErrServiceCancelled
	}

	if currentPaymentStatus == "paid" {
		return Service{}, ErrServicePaid
	}

	// Pastikan biaya jasa + spare part tidak melampaui BIGINT PostgreSQL.
	const maxInt64 = int64(^uint64(0) >> 1)
	if req.LaborCost < 0 || currentPartsCost < 0 || req.LaborCost > maxInt64-currentPartsCost {
		return Service{}, ErrTotalOverflow
	}

	// Pembayaran hanya boleh dicatat melalui CreatePayment.
	if currentPaymentStatus != "paid" && req.PaymentStatus == "paid" {
		return Service{}, ErrPaymentEndpoint
	}

	// Jika servis dibatalkan, kembalikan stok spare part yang sudah
	// dipakai dan nolkan biaya spare part. Baris service_parts tetap
	// disimpan sebagai riwayat.
	if req.Status == "cancelled" {
		if err := restorePartsStock(ctx, tx, id); err != nil {
			return Service{}, err
		}
	}

	err = tx.QueryRow(ctx, `
		UPDATE services
		SET
			diagnosis = $1,
			mechanic_name = $2,
			labor_cost = $3,
			total_cost = $3 + parts_cost,
			status = $4,
			payment_status = $5,
			notes = $6,
			updated_at = NOW()
		WHERE id = $7
		RETURNING
			id,
			service_number,
			customer_name,
			customer_phone,
			vehicle_plate,
			vehicle_brand,
			complaint,
			diagnosis,
			mechanic_name,
			labor_cost,
			parts_cost,
			total_cost,
			status,
			payment_status,
			notes,
			created_at,
			updated_at
	`,
		req.Diagnosis,
		req.MechanicName,
		req.LaborCost,
		req.Status,
		req.PaymentStatus,
		req.Notes,
		id,
	).Scan(
		&service.ID,
		&service.ServiceNumber,
		&service.CustomerName,
		&service.CustomerPhone,
		&service.VehiclePlate,
		&service.VehicleBrand,
		&service.Complaint,
		&service.Diagnosis,
		&service.MechanicName,
		&service.LaborCost,
		&service.PartsCost,
		&service.TotalCost,
		&service.Status,
		&service.PaymentStatus,
		&service.Notes,
		&service.CreatedAt,
		&service.UpdatedAt,
	)
	if err != nil {
		return Service{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Service{}, err
	}

	return service, nil
}

// AddPart menambahkan spare part ke servis dan mengurangi stok produk.
func (r *Repository) AddPart(
	ctx context.Context,
	serviceID int64,
	req AddServicePartRequest,
) (ServicePart, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return ServicePart{}, err
	}
	defer tx.Rollback(ctx)

	var serviceStatus string
	var paymentStatus string

	err = tx.QueryRow(ctx, `
		SELECT status, payment_status
		FROM services
		WHERE id = $1
		FOR UPDATE
	`, serviceID).Scan(&serviceStatus, &paymentStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ServicePart{}, ErrServiceNotFound
		}

		return ServicePart{}, fmt.Errorf("gagal membaca data servis: %w", err)
	}

	if serviceStatus == "completed" {
		return ServicePart{}, ErrServiceFinalized
	}

	if serviceStatus == "cancelled" {
		return ServicePart{}, ErrServiceCancelled
	}

	if paymentStatus == "paid" {
		return ServicePart{}, ErrServicePaid
	}

	if req.ProductID <= 0 || req.Quantity <= 0 {
		return ServicePart{}, ErrPartInvalidInput
	}

	var purchasePrice int64
	var sellingPrice int64
	var stock int
	var productName string

	err = tx.QueryRow(ctx, `
		SELECT name, purchase_price, selling_price, stock
		FROM products
		WHERE id = $1 AND is_active = TRUE
		FOR UPDATE
	`, req.ProductID).Scan(
		&productName,
		&purchasePrice,
		&sellingPrice,
		&stock,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ServicePart{}, fmt.Errorf(
				"%w: ID %d",
				ErrProductNotFound,
				req.ProductID,
			)
		}

		return ServicePart{}, fmt.Errorf("gagal membaca produk: %w", err)
	}

	if stock < req.Quantity {
		return ServicePart{}, fmt.Errorf(
			"%w: tersedia %d, diminta %d",
			ErrInsufficientStock,
			stock,
			req.Quantity,
		)
	}

	stockAfter := stock - req.Quantity

	var part ServicePart

	err = tx.QueryRow(ctx, `
		INSERT INTO service_parts (
			service_id,
			product_id,
			quantity,
			unit_cost,
			unit_price
		)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING
			id,
			service_id,
			product_id,
			quantity,
			unit_cost,
			unit_price,
			subtotal,
			created_at
	`,
		serviceID,
		req.ProductID,
		req.Quantity,
		purchasePrice,
		sellingPrice,
	).Scan(
		&part.ID,
		&part.ServiceID,
		&part.ProductID,
		&part.Quantity,
		&part.UnitCost,
		&part.UnitPrice,
		&part.Subtotal,
		&part.CreatedAt,
	)
	if err != nil {
		return ServicePart{}, err
	}

	part.ProductName = productName

	_, err = tx.Exec(ctx, `
		UPDATE products
		SET stock = $1, updated_at = NOW()
		WHERE id = $2
	`, stockAfter, req.ProductID)
	if err != nil {
		return ServicePart{}, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO stock_movements (
			product_id,
			movement_type,
			quantity,
			stock_before,
			stock_after,
			notes
		)
		VALUES ($1, 'out', $2, $3, $4, $5)
	`,
		req.ProductID,
		req.Quantity,
		stock,
		stockAfter,
		fmt.Sprintf("Penggunaan spare part servis %d", serviceID),
	)
	if err != nil {
		return ServicePart{}, err
	}

	_, err = tx.Exec(ctx, `
		UPDATE services
		SET
			parts_cost = (
				SELECT COALESCE(SUM(subtotal), 0)
				FROM service_parts
				WHERE service_id = $1
			),
			total_cost = labor_cost + (
				SELECT COALESCE(SUM(subtotal), 0)
				FROM service_parts
				WHERE service_id = $1
			),
			updated_at = NOW()
		WHERE id = $1
	`, serviceID)
	if err != nil {
		return ServicePart{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return ServicePart{}, err
	}

	return part, nil
}

// CreatePayment mencatat pembayaran tunai untuk servis yang telah selesai.
func (r *Repository) CreatePayment(
	ctx context.Context,
	serviceID int64,
	req CreatePaymentRequest,
) (ServicePayment, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return ServicePayment{}, err
	}
	defer tx.Rollback(ctx)

	var status string
	var paymentStatus string
	var totalCost int64

	err = tx.QueryRow(ctx, `
		SELECT status, payment_status, total_cost
		FROM services
		WHERE id = $1
		FOR UPDATE
	`, serviceID).Scan(
		&status,
		&paymentStatus,
		&totalCost,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ServicePayment{}, ErrServiceNotFound
		}

		return ServicePayment{}, fmt.Errorf("gagal membaca data servis: %w", err)
	}

	if status != "completed" {
		return ServicePayment{}, ErrServiceNotCompleted
	}

	if paymentStatus == "paid" {
		return ServicePayment{}, ErrServiceAlreadyPaid
	}

	if totalCost <= 0 {
		return ServicePayment{}, ErrInvalidServiceCost
	}
	var payment ServicePayment

	err = tx.QueryRow(ctx, `
		INSERT INTO service_payments (
			service_id,
			amount,
			payment_method,
			notes
		)
		VALUES ($1, $2, 'cash', $3)
		RETURNING
			id,
			service_id,
			amount,
			payment_method,
			paid_at,
			notes,
			created_at
	`,
		serviceID,
		totalCost,
		req.Notes,
	).Scan(
		&payment.ID,
		&payment.ServiceID,
		&payment.Amount,
		&payment.PaymentMethod,
		&payment.PaidAt,
		&payment.Notes,
		&payment.CreatedAt,
	)
	if err != nil {
		return ServicePayment{}, err
	}

	_, err = tx.Exec(ctx, `
		UPDATE services
		SET payment_status = 'paid',
		    updated_at = NOW()
		WHERE id = $1
	`, serviceID)
	if err != nil {
		return ServicePayment{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return ServicePayment{}, err
	}

	return payment, nil
}

// restorePartsStock mengembalikan stok seluruh spare part milik servis,
// mencatat pergerakan stok masuk, dan mengosongkan parts_cost servis.
func restorePartsStock(
	ctx context.Context,
	tx pgx.Tx,
	serviceID int64,
) error {
	type usedPart struct {
		productID int64
		quantity  int64
	}

	rows, err := tx.Query(ctx, `
		SELECT product_id, SUM(quantity)::BIGINT
		FROM service_parts
		WHERE service_id = $1
		GROUP BY product_id
		ORDER BY product_id
	`, serviceID)
	if err != nil {
		return err
	}

	parts := make([]usedPart, 0)

	for rows.Next() {
		var part usedPart

		if err := rows.Scan(&part.productID, &part.quantity); err != nil {
			rows.Close()
			return err
		}

		parts = append(parts, part)
	}

	rows.Close()

	if err := rows.Err(); err != nil {
		return err
	}

	const maxStock = int64(1<<31 - 1)
	for _, part := range parts {
		var stockBefore int

		err := tx.QueryRow(ctx, `
			SELECT stock
			FROM products
			WHERE id = $1
			FOR UPDATE
		`, part.productID).Scan(&stockBefore)
		if err != nil {
			return err
		}

		// TAMBAHAN: validasi stok awal
		if stockBefore < 0 || int64(stockBefore) > maxStock {
			return fmt.Errorf("stok awal produk %d tidak valid", part.productID)
		}

		if part.quantity <= 0 || part.quantity > maxStock || int64(stockBefore) > maxStock-part.quantity {
			return fmt.Errorf("stok produk %d akan melebihi batas maksimum saat pembatalan servis", part.productID)
		}
		stockAfter := stockBefore + int(part.quantity)

		if _, err := tx.Exec(ctx, `
			UPDATE products
			SET stock = $1, updated_at = NOW()
			WHERE id = $2
		`, stockAfter, part.productID); err != nil {
			return err
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO stock_movements (
				product_id, movement_type, quantity,
				stock_before, stock_after, notes
			)
			VALUES ($1, 'in', $2, $3, $4, $5)
		`,
			part.productID,
			part.quantity,
			stockBefore,
			stockAfter,
			fmt.Sprintf("Pembatalan servis %d", serviceID),
		); err != nil {
			return err
		}
	}

	_, err = tx.Exec(ctx, `
		UPDATE services
		SET parts_cost = 0, updated_at = NOW()
		WHERE id = $1
	`, serviceID)

	return err
}
