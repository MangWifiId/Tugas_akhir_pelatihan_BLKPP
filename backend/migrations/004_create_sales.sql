
CREATE TABLE IF NOT EXISTS sales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    subtotal BIGINT NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount BIGINT NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total BIGINT NOT NULL DEFAULT 0 CHECK (total >= 0),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
        CHECK (payment_method = 'cash'),
    status VARCHAR(20) NOT NULL DEFAULT 'completed'
        CHECK (status IN ('completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id BIGINT NOT NULL
        REFERENCES sales(id) ON DELETE RESTRICT,
    product_id BIGINT NOT NULL
        REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
    subtotal BIGINT NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_created_at
    ON sales(created_at);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id
    ON sale_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_product_id
    ON sale_items(product_id);
