-- Migration 001 hanya mengizinkan role 'admin' dan 'staff', padahal
-- backend memakai role 'owner', 'admin', dan 'mekanik'. Akibatnya tidak
-- ada user yang bisa mengakses endpoint produk, stok, penjualan, servis,
-- dan pembelian. Constraint diperbarui di sini.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('owner', 'admin', 'mekanik', 'staff'));
