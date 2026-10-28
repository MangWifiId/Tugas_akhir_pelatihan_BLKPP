package purchases

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/big"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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
	req CreatePurchaseRequest,
) (Purchase, error) {
	var purchase Purchase

	if len(req.Items) == 0 {
		return Purchase{}, ErrInvalidItem
	}

	// Urutkan item agar urutan penguncian (FOR UPDATE) selalu sama
	// dan dua transaksi pembelian tidak saling deadlock.
	sort.Slice(req.Items, func(i, j int) bool {
		return req.Items[i].ProductID < req.Items[j].ProductID
	})

	// Validasi duplikasi produk dan overflow subtotal sebelum transaksi.
	seen := make(map[int64]bool)
	var subtotal int64

	for _, item := range req.Items {
		if item.ProductID <= 0 || item.Quantity <= 0 || item.UnitCost < 0 {
			return Purchase{}, ErrInvalidItem
		}
		if seen[item.ProductID] {
			return Purchase{}, ErrDuplicateProduct
		}
		seen[item.ProductID] = true

		line := new(big.Int).Mul(
			big.NewInt(int64(item.Quantity)),
			big.NewInt(item.UnitCost),
		)
		if !line.IsInt64() {
			return Purchase{}, ErrAmountTooLarge
		}

		if item.UnitCost > 0 &&
			int64(item.Quantity) > math.MaxInt64/item.UnitCost {
			return Purchase{}, ErrAmountTooLarge
		}

		if subtotal > math.MaxInt64-line.Int64() {
			return Purchase{}, ErrAmountTooLarge
		}
		subtotal += line.Int64()
	}

	err := pgx.BeginFunc(ctx, r.db, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `
			INSERT INTO purchases (
				invoice_number, supplier_name, subtotal, notes
			)
			VALUES ($1, $2, $3, $4)
			RETURNING id, invoice_number, supplier_name, subtotal,
			          notes, created_at, updated_at
		`,
			req.InvoiceNumber,
			req.SupplierName,
			subtotal,
			req.Notes,
		).Scan(
			&purchase.ID,
			&purchase.InvoiceNumber,
			&purchase.SupplierName,
			&purchase.Subtotal,
			&purchase.Notes,
			&purchase.CreatedAt,
			&purchase.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("gagal membuat faktur pembelian: %w", err)
		}

		for _, item := range req.Items {
			var currentStock int
			var oldCost int64
			var isActive bool

			err := tx.QueryRow(ctx, `
				SELECT stock, purchase_price, is_active
				FROM products
				WHERE id = $1
				FOR UPDATE
			`, item.ProductID).Scan(
				&currentStock,
				&oldCost,
				&isActive,
			)
			if errors.Is(err, pgx.ErrNoRows) {
				return fmt.Errorf(
					"%w: ID %d",
					ErrProductNotFound,
					item.ProductID,
				)
			}
			if err != nil {
				return fmt.Errorf("gagal membaca produk: %w", err)
			}
			if !isActive {
				return fmt.Errorf(
					"%w: ID %d",
					ErrProductInactive,
					item.ProductID,
				)
			}

			if currentStock < 0 || currentStock > math.MaxInt32 ||
				item.Quantity > math.MaxInt32-currentStock {
				return fmt.Errorf(
					"%w: produk ID %d",
					ErrStockTooLarge,
					item.ProductID,
				)
			}

			newStock := currentStock + item.Quantity

			// Jika belum ada stok, HPP awal mengikuti harga pembelian.
			// Jika sudah ada stok, gunakan moving weighted average.
			var newCost int64
			if currentStock == 0 {
				newCost = item.UnitCost
			} else {
				oldValue := new(big.Int).Mul(
					big.NewInt(int64(currentStock)),
					big.NewInt(oldCost),
				)
				newValue := new(big.Int).Mul(
					big.NewInt(int64(item.Quantity)),
					big.NewInt(item.UnitCost),
				)
				totalValue := new(big.Int).Add(oldValue, newValue)
				totalQty := big.NewInt(int64(newStock))
				totalValue.Quo(totalValue, totalQty)

				if !totalValue.IsInt64() {
					return fmt.Errorf(
						"%w: HPP produk ID %d",
						ErrAmountTooLarge,
						item.ProductID,
					)
				}
				newCost = totalValue.Int64()
			}

			if _, err := tx.Exec(ctx, `
				UPDATE products
				SET stock = $1,
				    purchase_price = $2,
				    updated_at = NOW()
				WHERE id = $3
			`, newStock, newCost, item.ProductID); err != nil {
				return fmt.Errorf("gagal memperbarui stok dan HPP: %w", err)
			}

			if _, err := tx.Exec(ctx, `
    INSERT INTO purchase_items (
        purchase_id, product_id, quantity, unit_cost
    )
    VALUES ($1, $2, $3, $4)
`,
				purchase.ID,
				item.ProductID,
				item.Quantity,
				item.UnitCost,
			); err != nil {
				return fmt.Errorf("gagal menyimpan detail pembelian: %w", err)
			}

			if _, err := tx.Exec(ctx, `
				INSERT INTO stock_movements (
					product_id, movement_type, quantity,
					stock_before, stock_after, notes
				)
				VALUES ($1, 'in', $2, $3, $4, $5)
			`,
				item.ProductID,
				item.Quantity,
				currentStock,
				newStock,
				"Pembelian "+req.InvoiceNumber,
			); err != nil {
				return fmt.Errorf("gagal mencatat riwayat stok: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return Purchase{}, ErrInvoiceNumberExists
		}
		return Purchase{}, err
	}

	return purchase, nil
}

func (r *Repository) GetAll(
	ctx context.Context,
	limit int,
	offset int,
) ([]Purchase, int64, error) {
	var total int64

	if err := r.db.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM purchases`,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("gagal menghitung pembelian: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, invoice_number, supplier_name, subtotal,
		       notes, created_at, updated_at
		FROM purchases
		ORDER BY created_at DESC, id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("gagal mengambil pembelian: %w", err)
	}
	defer rows.Close()

	purchases := make([]Purchase, 0)

	for rows.Next() {
		var purchase Purchase

		if err := rows.Scan(
			&purchase.ID,
			&purchase.InvoiceNumber,
			&purchase.SupplierName,
			&purchase.Subtotal,
			&purchase.Notes,
			&purchase.CreatedAt,
			&purchase.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("gagal membaca data pembelian: %w", err)
		}

		purchases = append(purchases, purchase)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("gagal membaca hasil query pembelian: %w", err)
	}

	return purchases, total, nil
}

func (r *Repository) GetByID(
	ctx context.Context,
	id int64,
) (Purchase, error) {
	var purchase Purchase

	err := r.db.QueryRow(ctx, `
		SELECT id, invoice_number, supplier_name, subtotal,
		       notes, created_at, updated_at
		FROM purchases
		WHERE id = $1
	`, id).Scan(
		&purchase.ID,
		&purchase.InvoiceNumber,
		&purchase.SupplierName,
		&purchase.Subtotal,
		&purchase.Notes,
		&purchase.CreatedAt,
		&purchase.UpdatedAt,
	)
	if err != nil {
		return Purchase{}, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT pi.id, pi.purchase_id, pi.product_id,
		       COALESCE(p.name, ''), pi.quantity,
		       pi.unit_cost, pi.subtotal, pi.created_at
		FROM purchase_items pi
		LEFT JOIN products p ON p.id = pi.product_id
		WHERE pi.purchase_id = $1
		ORDER BY pi.id
	`, purchase.ID)
	if err != nil {
		return Purchase{}, fmt.Errorf("gagal mengambil detail pembelian: %w", err)
	}
	defer rows.Close()

	purchase.Items = make([]PurchaseItem, 0)

	for rows.Next() {
		var item PurchaseItem

		if err := rows.Scan(
			&item.ID,
			&item.PurchaseID,
			&item.ProductID,
			&item.ProductName,
			&item.Quantity,
			&item.UnitCost,
			&item.Subtotal,
			&item.CreatedAt,
		); err != nil {
			return Purchase{}, fmt.Errorf("gagal membaca detail pembelian: %w", err)
		}

		purchase.Items = append(purchase.Items, item)
	}

	if err := rows.Err(); err != nil {
		return Purchase{}, fmt.Errorf("gagal membaca hasil detail pembelian: %w", err)
	}

	return purchase, nil
}
