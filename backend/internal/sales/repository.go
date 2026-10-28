package sales

import (
	"context"
	"fmt"
	"math"
	"sort"
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

func (r *Repository) Create(
	ctx context.Context,
	req CreateSaleRequest,
	userID int64,
) (Sale, error) {
	if err := validateSaleRequest(userID, req.Items); err != nil {
		return Sale{}, err
	}

	sortSaleItems(req.Items)

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Sale{}, err
	}
	defer tx.Rollback(ctx)

	sale := Sale{
		UserID: &userID,
		InvoiceNumber: fmt.Sprintf(
			"INV-%s",
			time.Now().Format("20060102150405.000000"),
		),
		PaymentMethod: "cash",
		Status:        "completed",
		Discount:      0,
		Notes:         req.Notes,
		Items:         make([]SaleItem, 0, len(req.Items)),
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO sales (
			user_id,
			invoice_number,
			subtotal,
			discount,
			total,
			payment_method,
			status,
			notes
		)
		VALUES ($1, $2, 0, 0, 0, 'cash', 'completed', $3)
		RETURNING id, created_at, updated_at
	`,
		userID,
		sale.InvoiceNumber,
		sale.Notes,
	).Scan(
		&sale.ID,
		&sale.CreatedAt,
		&sale.UpdatedAt,
	)
	if err != nil {
		return Sale{}, err
	}

	for _, item := range req.Items {
		var name string
		var price int64
		var stock int
		var active bool

		err = tx.QueryRow(ctx, `
			SELECT name, selling_price, stock, is_active
			FROM products
			WHERE id = $1
			FOR UPDATE
		`, item.ProductID).Scan(
			&name,
			&price,
			&stock,
			&active,
		)
		if err != nil {
			if err == pgx.ErrNoRows {
				return Sale{}, fmt.Errorf(
					"%w: ID %d",
					ErrProductNotFound,
					item.ProductID,
				)
			}
			return Sale{}, err
		}

		if !active {
			return Sale{}, fmt.Errorf(
				"%w: %s",
				ErrProductInactive,
				name,
			)
		}

		if price < 0 {
			return Sale{}, fmt.Errorf(
				"%w: %s",
				ErrInvalidPrice,
				name,
			)
		}

		if stock < 0 || stock < item.Quantity {
			return Sale{}, fmt.Errorf(
				"%w: %s",
				ErrInsufficientStock,
				name,
			)
		}

		itemSubtotal, err := saleItemSubtotal(price, item.Quantity)
		if err != nil {
			return Sale{}, fmt.Errorf("%w: %s", err, name)
		}

		sale.Subtotal, err = addSaleSubtotal(sale.Subtotal, itemSubtotal)
		if err != nil {
			return Sale{}, err
		}

		var saleItem SaleItem

		err = tx.QueryRow(ctx, `
			INSERT INTO sale_items (
				sale_id,
				product_id,
				quantity,
				unit_price,
				subtotal
			)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING
				id,
				sale_id,
				product_id,
				quantity,
				unit_price,
				subtotal
		`,
			sale.ID,
			item.ProductID,
			item.Quantity,
			price,
			itemSubtotal,
		).Scan(
			&saleItem.ID,
			&saleItem.SaleID,
			&saleItem.ProductID,
			&saleItem.Quantity,
			&saleItem.UnitPrice,
			&saleItem.Subtotal,
		)
		if err != nil {
			return Sale{}, err
		}

		saleItem.ProductName = name
		sale.Items = append(sale.Items, saleItem)

		stockAfter := stock - item.Quantity

		_, err = tx.Exec(ctx, `
			UPDATE products
			SET stock = $1, updated_at = NOW()
			WHERE id = $2
		`, stockAfter, item.ProductID)
		if err != nil {
			return Sale{}, err
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO stock_movements (
				user_id,
				product_id,
				movement_type,
				quantity,
				stock_before,
				stock_after,
				notes
			)
			VALUES ($1, $2, 'out', $3, $4, $5, $6)
		`,
			userID,
			item.ProductID,
			item.Quantity,
			stock,
			stockAfter,
			"Penjualan "+sale.InvoiceNumber,
		)
		if err != nil {
			return Sale{}, err
		}
	}

	sale.Total = sale.Subtotal - sale.Discount

	err = tx.QueryRow(ctx, `
		UPDATE sales
		SET subtotal = $1,
		    total = $2,
		    updated_at = NOW()
		WHERE id = $3
		RETURNING updated_at
	`,
		sale.Subtotal,
		sale.Total,
		sale.ID,
	).Scan(&sale.UpdatedAt)
	if err != nil {
		return Sale{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Sale{}, err
	}

	return sale, nil
}

func (r *Repository) GetAll(
	ctx context.Context,
	limit int,
	offset int,
) ([]Sale, int64, error) {
	var total int64

	if err := r.db.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM sales`,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("gagal menghitung penjualan: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			id,
			user_id,
			invoice_number,
			subtotal,
			discount,
			total,
			payment_method,
			status,
			notes,
			created_at,
			updated_at
		FROM sales
		ORDER BY created_at DESC, id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("gagal mengambil penjualan: %w", err)
	}
	defer rows.Close()

	salesList := make([]Sale, 0)

	for rows.Next() {
		var sale Sale

		err := rows.Scan(
			&sale.ID,
			&sale.UserID,
			&sale.InvoiceNumber,
			&sale.Subtotal,
			&sale.Discount,
			&sale.Total,
			&sale.PaymentMethod,
			&sale.Status,
			&sale.Notes,
			&sale.CreatedAt,
			&sale.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("gagal membaca data penjualan: %w", err)
		}

		salesList = append(salesList, sale)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("gagal membaca hasil query penjualan: %w", err)
	}

	return salesList, total, nil
}

func (r *Repository) GetByID(
	ctx context.Context,
	id int64,
) (Sale, error) {
	var sale Sale

	err := r.db.QueryRow(ctx, `
		SELECT
			id,
			user_id,
			invoice_number,
			subtotal,
			discount,
			total,
			payment_method,
			status,
			notes,
			created_at,
			updated_at
		FROM sales
		WHERE id = $1
	`, id).Scan(
		&sale.ID,
		&sale.UserID,
		&sale.InvoiceNumber,
		&sale.Subtotal,
		&sale.Discount,
		&sale.Total,
		&sale.PaymentMethod,
		&sale.Status,
		&sale.Notes,
		&sale.CreatedAt,
		&sale.UpdatedAt,
	)
	if err != nil {
		return Sale{}, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			si.id,
			si.sale_id,
			si.product_id,
			COALESCE(p.name, ''),
			si.quantity,
			si.unit_price,
			si.subtotal
		FROM sale_items si
		LEFT JOIN products p ON p.id = si.product_id
		WHERE si.sale_id = $1
		ORDER BY si.id
	`, sale.ID)
	if err != nil {
		return Sale{}, err
	}
	defer rows.Close()

	sale.Items = make([]SaleItem, 0)

	for rows.Next() {
		var item SaleItem

		err := rows.Scan(
			&item.ID,
			&item.SaleID,
			&item.ProductID,
			&item.ProductName,
			&item.Quantity,
			&item.UnitPrice,
			&item.Subtotal,
		)
		if err != nil {
			return Sale{}, err
		}

		sale.Items = append(sale.Items, item)
	}

	if err := rows.Err(); err != nil {
		return Sale{}, err
	}

	return sale, nil
}

func validateSaleRequest(
	userID int64,
	items []CreateSaleItemRequest,
) error {
	if userID <= 0 || len(items) == 0 {
		return ErrInvalidInput
	}

	seen := make(map[int64]bool, len(items))

	for _, item := range items {
		if item.ProductID <= 0 || item.Quantity <= 0 {
			return fmt.Errorf(
				"%w: ID produk dan jumlah harus lebih dari 0",
				ErrInvalidInput,
			)
		}

		if seen[item.ProductID] {
			return ErrDuplicateProduct
		}

		seen[item.ProductID] = true
	}

	return nil
}

// sortSaleItems mengurutkan item berdasarkan product_id agar urutan
// penguncian baris (FOR UPDATE) selalu sama dan tidak terjadi deadlock.
func sortSaleItems(items []CreateSaleItemRequest) {
	sort.Slice(items, func(i, j int) bool {
		return items[i].ProductID < items[j].ProductID
	})
}

func saleItemSubtotal(price int64, quantity int) (int64, error) {
	if price < 0 {
		return 0, ErrInvalidPrice
	}

	if quantity <= 0 {
		return 0, ErrInvalidInput
	}

	qty := int64(quantity)
	if price > 0 && qty > math.MaxInt64/price {
		return 0, ErrSubtotalOverflow
	}

	return price * qty, nil
}

func addSaleSubtotal(current int64, line int64) (int64, error) {
	if current < 0 || line < 0 || current > math.MaxInt64-line {
		return 0, ErrTotalOverflow
	}

	return current + line, nil
}
