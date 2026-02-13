-- Follow-up Module Tables

-- Follow-up Rules
CREATE TABLE followup_rules (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    days_inactive INTEGER NOT NULL,
    message_template TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_followup_rules_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Follow-up Logs
CREATE TABLE followup_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    rule_id INTEGER NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'SENT', -- SENT, FAILED, RESPONDED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_followup_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_followup_logs_rule FOREIGN KEY (rule_id) REFERENCES followup_rules(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_followup_rules_tenant ON followup_rules(tenant_id);
CREATE INDEX idx_followup_logs_customer ON followup_logs(customer_phone);
