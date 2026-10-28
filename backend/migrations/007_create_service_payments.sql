
CREATE TABLE IF NOT EXISTS service_payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    service_id BIGINT NOT NULL UNIQUE
        REFERENCES services(id),

    amount BIGINT NOT NULL CHECK (amount > 0),

    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
        CHECK (payment_method = 'cash'),

    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_payments_paid_at
    ON service_payments(paid_at);
