// User domain definition (ISO-ready, no logic).
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AGENTE: 'AGENTE'
};

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

export class UserEntity {
  constructor({ id, name, email, username, role, status, createdAt, updatedAt }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.username = username;
    this.role = role;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export const UserEntityDefinition = {
  table: 'users',
  identity: 'user',
  description: 'Enterprise user model, versioned under /api/v1 (ISO 27001 aligned).',
  fields: {
    id: { type: 'uuid', required: true, pk: true },
    name: { type: 'string', required: true, comment: 'Full name / display name' },
    email: { type: 'string', required: true, unique: true, comment: 'Unique per tenant; audited' },
    username: { type: 'string', required: true, unique: true },
    role: { type: 'enum', values: Object.values(USER_ROLES), required: true },
    status: { type: 'enum', values: Object.values(USER_STATUS), required: true, default: USER_STATUS.ACTIVE },
    createdAt: { type: 'timestamp', required: true },
    updatedAt: { type: 'timestamp', required: true }
  },
  audit: {
    enabled: true,
    events: ['created', 'updated', 'status_changed', 'role_changed', 'deleted'],
    privacy: 'no credentials stored in audit payloads'
  },
  compliance: {
    iso27001: [
      'unique email',
      'status gate (ACTIVE/INACTIVE)',
      'no credentials or secrets stored in this entity'
    ]
  }
};
