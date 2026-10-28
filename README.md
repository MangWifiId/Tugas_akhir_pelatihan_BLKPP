# Workshop Management System (Tugas Akhir)

Backend Go (Gin + PostgreSQL) dan frontend statis untuk manajemen bengkel:
inventaris, pembelian, penjualan, dan servis.

## Menjalankan backend

```bash
cd backend
cp .env.example .env      # lalu isi DATABASE_URL dan JWT_SECRET (>= 32 karakter)
go mod tidy
go run ./cmd/api
```

Migrasi database dijalankan otomatis saat server start. Migration
`010_add_user_references.sql` menambahkan kolom `user_id` yang dipakai
modul penjualan pada `sales` dan `stock_movements`.

## Role pengguna

- User **pertama** yang mendaftar (`POST /api/auth/register`) otomatis menjadi `owner`.
- User berikutnya berstatus `staff` (belum punya akses modul).
- Owner mengubah role lewat `PUT /api/users/:id/role` dengan body
  `{"role": "admin"}` (pilihan: `owner`, `admin`, `mekanik`, `staff`).
  User yang diubah perlu login ulang agar token memuat role baru.

| Role    | Akses                                              |
|---------|----------------------------------------------------|
| owner   | semua modul + kelola role + daftar pengguna        |
| admin   | produk, stok, penjualan, pembelian, servis         |
| mekanik | lihat servis, ubah servis, tambah spare part       |

## Endpoint tambahan

- `GET /api/auth/me` — data pengguna yang sedang login.
- `GET /api/users` — daftar pengguna (khusus owner).
- `GET /api/purchases` dan `GET /api/purchases/:id` — riwayat pembelian.
- Semua endpoint daftar mendukung pagination `?page=1&limit=20`
  (limit maksimum 100) dan mengembalikan `meta` berisi `page`, `limit`,
  dan `total`.
- Login dibatasi 10 percobaan/menit per IP dan registrasi 5 percobaan/menit
  per IP.

## Frontend

Frontend (Vite + React) menjalankan halaman login dan memanggil
`POST /api/auth/login`. Jalankan dengan `cd frontend && npm install && npm run dev`,
atau buka `frontend/index.html` lewat Live Server.
