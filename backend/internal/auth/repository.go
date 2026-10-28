package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// registrationLockKey dipakai untuk mengunci proses registrasi
// pertama agar dua request yang masuk bersamaan tidak sama-sama
// mendapatkan role owner.
const registrationLockKey int64 = 0x54414B41 // "TAKA"

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateUser(
	ctx context.Context,
	name string,
	email string,
	passwordHash string,
) (User, error) {
	var user User

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return User{}, fmt.Errorf("gagal memulai transaksi: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// Advisory lock membuat pengecekan "user pertama" dan INSERT
	// menjadi atomik antar request/instance.
	if _, err := tx.Exec(
		ctx,
		`SELECT pg_advisory_xact_lock($1)`,
		registrationLockKey,
	); err != nil {
		return User{}, fmt.Errorf("gagal mengunci proses registrasi: %w", err)
	}

	var hasUser bool
	if err := tx.QueryRow(
		ctx,
		`SELECT EXISTS (SELECT 1 FROM users)`,
	).Scan(&hasUser); err != nil {
		return User{}, fmt.Errorf("gagal memeriksa pengguna: %w", err)
	}

	role := "staff"
	if !hasUser {
		role = "owner"
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, email, role, is_active, created_at, updated_at
	`,
		name,
		email,
		passwordHash,
		role,
	).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return User{}, fmt.Errorf("gagal membuat pengguna: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, fmt.Errorf("gagal menyimpan pengguna: %w", err)
	}

	return user, nil
}

// CreateUserWithRole membuat pengguna baru dengan role tertentu.
// Dipakai oleh owner untuk menambahkan anggota tim.
func (r *Repository) CreateUserWithRole(
	ctx context.Context,
	name string,
	email string,
	passwordHash string,
	role string,
) (User, error) {
	var user User

	err := r.db.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, email, role, is_active, created_at, updated_at
	`,
		name,
		email,
		passwordHash,
		role,
	).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return User{}, err
	}

	return user, nil
}

func (r *Repository) FindUserByEmail(
	ctx context.Context,
	email string,
) (User, error) {
	var user User

	query := `
		SELECT id, name, email, password_hash, role,
		       is_active, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, pgx.ErrNoRows
		}

		return User{}, fmt.Errorf("gagal mencari pengguna: %w", err)
	}

	return user, nil
}

func (r *Repository) FindUserByID(
	ctx context.Context,
	id int64,
) (User, error) {
	var user User

	err := r.db.QueryRow(ctx, `
		SELECT id, name, email, role, is_active, created_at, updated_at
		FROM users
		WHERE id = $1
	`, id).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, pgx.ErrNoRows
		}

		return User{}, fmt.Errorf("gagal mencari pengguna: %w", err)
	}

	return user, nil
}

func (r *Repository) GetAllUsers(
	ctx context.Context,
	limit int,
	offset int,
) ([]User, int64, error) {
	var total int64

	if err := r.db.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM users`,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("gagal menghitung pengguna: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, name, email, role, is_active, created_at, updated_at
		FROM users
		ORDER BY id
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("gagal mengambil daftar pengguna: %w", err)
	}
	defer rows.Close()

	users := make([]User, 0)

	for rows.Next() {
		var user User

		if err := rows.Scan(
			&user.ID,
			&user.Name,
			&user.Email,
			&user.Role,
			&user.IsActive,
			&user.CreatedAt,
			&user.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("gagal membaca data pengguna: %w", err)
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("gagal membaca hasil query pengguna: %w", err)
	}

	return users, total, nil
}

// UpdateRole mengubah role pengguna. Mengembalikan pgx.ErrNoRows
// jika pengguna tidak ditemukan.
func (r *Repository) UpdateRole(
	ctx context.Context,
	id int64,
	role string,
) (User, error) {
	var user User

	err := r.db.QueryRow(ctx, `
		UPDATE users
		SET role = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, name, email, role, is_active, created_at, updated_at
	`, role, id).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return User{}, err
	}

	return user, nil
}
