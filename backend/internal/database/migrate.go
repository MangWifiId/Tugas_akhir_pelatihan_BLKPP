package database

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Migrate(db *pgxpool.Pool) error {
	ctx, cancel := context.WithTimeout(
		context.Background(),
		30*time.Second,
	)
	defer cancel()

	// Membuat tabel untuk mencatat migration.
	_, err := db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("gagal membuat tabel schema_migrations: %w", err)
	}

	// Mencari dan mengurutkan file SQL.
	// Mendukung menjalankan dari folder backend maupun root proyek.
	migrationsDir := "migrations"
	if _, statErr := os.Stat(migrationsDir); statErr != nil {
		migrationsDir = filepath.Join("backend", "migrations")
	}

	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	if err != nil {
		return fmt.Errorf("gagal mencari file migration: %w", err)
	}

	sort.Strings(files)

	for _, file := range files {
		filename := filepath.Base(file)

		var exists bool
		err := db.QueryRow(ctx,
			`SELECT EXISTS (
				SELECT 1 FROM schema_migrations WHERE filename = $1
			)`,
			filename,
		).Scan(&exists)
		if err != nil {
			return fmt.Errorf("gagal memeriksa migration %s: %w", filename, err)
		}

		if exists {
			fmt.Println("Migration dilewati:", filename)
			continue
		}

		query, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("gagal membaca %s: %w", filename, err)
		}

		tx, err := db.Begin(ctx)
		if err != nil {
			return fmt.Errorf("gagal memulai transaksi: %w", err)
		}

		if _, err = tx.Exec(ctx, string(query)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("gagal menjalankan migration %s: %w", filename, err)
		}

		_, err = tx.Exec(ctx,
			`INSERT INTO schema_migrations (filename) VALUES ($1)`,
			filename,
		)
		if err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("gagal mencatat migration %s: %w", filename, err)
		}

		if err = tx.Commit(ctx); err != nil {
			return fmt.Errorf("gagal menyimpan migration %s: %w", filename, err)
		}

		fmt.Println("Migration berhasil:", filename)
	}

	return nil
}
