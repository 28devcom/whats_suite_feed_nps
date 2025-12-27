-- Enable extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Roles catalog keeps role names normalized and auditable
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(32) NOT NULL UNIQUE
);

-- Users table geared for high read/write with indexes
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Audit trail for authentication events (login/logout/force_logout)
CREATE TABLE IF NOT EXISTS auth_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(32) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (event_type IN ('login', 'logout', 'force_logout'))
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id_created_at ON auth_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON auth_events(event_type);

-- Seed base roles
INSERT INTO roles(name) VALUES ('ADMIN'), ('SUPERVISOR'), ('AGENTE')
ON CONFLICT (name) DO NOTHING;
