package stock

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// maxStock adalah batas nilai kolom products.stock (PostgreSQL INTEGER).
const maxStock = int64(1<<31 - 1)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Create mencatat pergerakan stok dan memperbarui stok produk
// dalam satu transaksi database.
func (r *Repository) Create(
	ctx context.Context,
	req CreateStockMovementRequest,
) (StockMovement, error) {
	var movement StockMovement

	err := pgx.BeginFunc(ctx, r.db, func(tx pgx.Tx) error {
		// Kunci baris produk agar perubahan stok bersamaan
		// tidak membaca dan mengubah stok secara tidak aman.
		var stockBefore int
		var isActive bool

		err := tx.QueryRow(ctx, `
			SELECT stock, is_active
			FROM products
			WHERE id = $1
			FOR UPDATE
		`, req.ProductID).Scan(&stockBefore, &isActive)

		if errors.Is(err, pgx.ErrNoRows) {
			return ErrProductNotFound
		}
		if err != nil {
			return fmt.Errorf("gagal membaca stok produk: %w", err)
		}
		if !isActive {
			return ErrProductInactive
		}

		stockAfter, err := computeStockAfter(
			req.MovementType,
			req.AdjustmentDirection,
			req.Quantity,
			stockBefore,
		)
		if err != nil {
			return err
		}

		// Perbarui stok produk.
		_, err = tx.Exec(ctx, `
			UPDATE products
			SET stock = $1, updated_at = NOW()
			WHERE id = $2
		`, stockAfter, req.ProductID)
		if err != nil {
			return fmt.Errorf("gagal memperbarui stok: %w", err)
		}

		// Simpan riwayat pergerakan stok.
		err = tx.QueryRow(ctx, `
			INSERT INTO stock_movements (
				product_id,
				movement_type,
				quantity,
				stock_before,
				stock_after,
				notes
			)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, product_id, movement_type, quantity,
			          stock_before, stock_after, notes, created_at
		`,
			req.ProductID,
			req.MovementType,
			req.Quantity,
			stockBefore,
			stockAfter,
			req.Notes,
		).Scan(
			&movement.ID,
			&movement.ProductID,
			&movement.MovementType,
			&movement.Quantity,
			&movement.StockBefore,
			&movement.StockAfter,
			&movement.Notes,
			&movement.CreatedAt,
		)
		if err != nil {
			return fmt.Errorf("gagal menyimpan riwayat stok: %w", err)
		}

		return nil
	})

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			return StockMovement{}, fmt.Errorf(
				"database gagal menyimpan pergerakan stok: %w", err,
			)
		}
		return StockMovement{}, err
	}

	return movement, nil
}

func (r *Repository) GetMovements(
	ctx context.Context,
	productID int64,
	limit int,
	offset int,
) ([]StockMovement, int64, error) {
	where := ""
	args := []any{}

	if productID > 0 {
		where = ` WHERE product_id = $1`
		args = append(args, productID)
	}

	var total int64
	if err := r.db.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM stock_movements`+where,
		args...,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("gagal menghitung riwayat stok: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT id, product_id, movement_type, quantity,
		       stock_before, stock_after, notes, created_at
		FROM stock_movements
		%s
		ORDER BY created_at DESC, id DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)+1, len(args)+2)

	rows, err := r.db.Query(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("gagal mengambil riwayat stok: %w", err)
	}
	defer rows.Close()

	movements := make([]StockMovement, 0)

	for rows.Next() {
		var movement StockMovement

		err := rows.Scan(
			&movement.ID,
			&movement.ProductID,
			&movement.MovementType,
			&movement.Quantity,
			&movement.StockBefore,
			&movement.StockAfter,
			&movement.Notes,
			&movement.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("gagal membaca riwayat stok: %w", err)
		}

		movements = append(movements, movement)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("gagal membaca hasil riwayat stok: %w", err)
	}

	return movements, total, nil
}

// computeStockAfter menghitung stok akhir dari sebuah pergerakan stok.
// Fungsi ini dipisahkan agar logika stok dapat diuji tanpa database.
func computeStockAfter(
	movementType string,
	adjustmentDirection string,
	quantity int,
	stockBefore int,
) (int, error) {
	if stockBefore < 0 || int64(stockBefore) > maxStock {
		return 0, ErrInvalidStock
	}

	if quantity <= 0 {
		return 0, ErrInvalidQuantity
	}

	switch movementType {
	case "in":
		return addStock(stockBefore, quantity)

	case "out":
		if quantity > stockBefore {
			return 0, ErrInsufficientStock
		}
		return stockBefore - quantity, nil

	case "adjustment":
		switch adjustmentDirection {
		case "increase":
			return addStock(stockBefore, quantity)
		case "decrease":
			if quantity > stockBefore {
				return 0, ErrInsufficientStock
			}
			return stockBefore - quantity, nil
		default:
			return 0, ErrInvalidDirection
		}

	default:
		return 0, ErrInvalidMovement
	}
}

func addStock(stockBefore int, quantity int) (int, error) {
	if int64(quantity) > maxStock-int64(stockBefore) {
		return 0, ErrStockOverflow
	}

	return stockBefore + quantity, nil
}
