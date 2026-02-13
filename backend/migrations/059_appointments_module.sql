-- Appointments Module Tables

-- Appointments
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, CONFIRMED, CANCELLED, NO_SHOW, COMPLETED
    description TEXT,
    location VARCHAR(255),
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_appointments_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Appointment Reminders
CREATE TABLE appointment_reminders (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    reminder_type VARCHAR(50) NOT NULL, -- 24H_BEFORE, 1H_BEFORE
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reminders_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_reminders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_date ON appointments(start_at);
CREATE INDEX idx_appointments_phone ON appointments(customer_phone);
CREATE INDEX idx_reminders_scheduled ON appointment_reminders(scheduled_at);
