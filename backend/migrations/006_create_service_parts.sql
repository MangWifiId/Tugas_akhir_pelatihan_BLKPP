
CREATE TABLE IF NOT EXISTS service_parts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    service_id BIGINT NOT NULL
        REFERENCES services(id),

    product_id BIGINT NOT NULL
        REFERENCES products(id),

    quantity INTEGER NOT NULL
        CHECK (quantity > 0),

    unit_cost BIGINT NOT NULL
        CHECK (unit_cost >= 0),

    unit_price BIGINT NOT NULL
        CHECK (unit_price >= 0),

    subtotal BIGINT GENERATED ALWAYS AS
        (quantity::BIGINT * unit_price) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_parts_service_id
    ON service_parts(service_id);

CREATE INDEX IF NOT EXISTS idx_service_parts_product_id
    ON service_parts(product_id);
