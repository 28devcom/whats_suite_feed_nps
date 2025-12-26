const ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AGENTE: 'AGENTE'
};

export { ROLES };

export default class User {
  constructor({ id, email, username, fullName, passwordHash, role, status, lastLoginAt, createdAt, updatedAt, tenantId }) {
    this.id = id;
    this.email = email;
    this.username = username;
    this.fullName = fullName;
    this.passwordHash = passwordHash;
    this.role = role;
    this.status = status;
    this.lastLoginAt = lastLoginAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.tenantId = tenantId;
  }
}
