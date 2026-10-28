
CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    movement_type VARCHAR(20) NOT NULL
        CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    stock_before INTEGER NOT NULL CHECK (stock_before >= 0),
    stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id
    ON stock_movements(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
    ON stock_movements(created_at);

