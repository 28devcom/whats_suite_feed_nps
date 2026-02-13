-- Feedback Module Tables

-- Feedback Templates
CREATE TABLE feedback_templates (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'NPS', -- NPS, CSAT, CES, OPEN
    message_text TEXT NOT NULL,
    options JSONB, -- For fixed options like CSAT or multiple choice
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_templates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Feedback Settings
CREATE TABLE feedback_settings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT false,
    wait_time_hours INTEGER DEFAULT 2,
    trigger_event VARCHAR(50) DEFAULT 'CHAT_CLOSED',
    template_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_settings_template FOREIGN KEY (template_id) REFERENCES feedback_templates(id) ON DELETE SET NULL
);

-- Feedback Responses
CREATE TABLE feedback_responses (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    conversation_id INTEGER,
    template_id INTEGER NOT NULL,
    score INTEGER, -- 0-10 for NPS, 1-5 for CSAT
    comment TEXT,
    metadata JSONB, -- For storing extra context
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_responses_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_responses_template FOREIGN KEY (template_id) REFERENCES feedback_templates(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_feedback_responses_tenant ON feedback_responses(tenant_id);
CREATE INDEX idx_feedback_responses_customer ON feedback_responses(customer_phone);
CREATE INDEX idx_feedback_responses_template ON feedback_responses(template_id);
CREATE INDEX idx_feedback_templates_tenant ON feedback_templates(tenant_id);
