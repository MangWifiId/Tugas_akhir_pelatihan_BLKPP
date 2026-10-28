-- 010_add_user_references.sql
-- Kolom user_id dipakai oleh kode sales (sales dan stock_movements),
-- tetapi belum pernah dibuat di migration 003/004. Tanpa migration ini,
-- instalasi baru akan gagal saat POST /api/sales.
ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id);

ALTER TABLE stock_movements
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_sales_user_id
    ON sales(user_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id
    ON stock_movements(user_id);
