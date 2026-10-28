
CREATE TABLE IF NOT EXISTS purchases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(150),
    subtotal BIGINT NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_id BIGINT NOT NULL
        REFERENCES purchases(id) ON DELETE RESTRICT,
    product_id BIGINT NOT NULL
        REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost BIGINT NOT NULL CHECK (unit_cost >= 0),
    subtotal BIGINT GENERATED ALWAYS AS
        (quantity::BIGINT * unit_cost) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_created_at
    ON purchases(created_at);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id
    ON purchase_items(purchase_id);

CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id
    ON purchase_items(product_id);
