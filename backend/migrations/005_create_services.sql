
CREATE TABLE IF NOT EXISTS services (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_number VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(30),
    vehicle_plate VARCHAR(20) NOT NULL,
    vehicle_brand VARCHAR(100),
    complaint TEXT NOT NULL,
    diagnosis TEXT,
    mechanic_name VARCHAR(100),
    labor_cost BIGINT NOT NULL DEFAULT 0
        CHECK (labor_cost >= 0),
    parts_cost BIGINT NOT NULL DEFAULT 0
        CHECK (parts_cost >= 0),
    total_cost BIGINT NOT NULL DEFAULT 0
        CHECK (total_cost >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'in_progress',
            'completed',
            'cancelled'
        )),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'paid')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_created_at
    ON services(created_at);

CREATE INDEX IF NOT EXISTS idx_services_status
    ON services(status);

CREATE INDEX IF NOT EXISTS idx_services_vehicle_plate
    ON services(vehicle_plate);
