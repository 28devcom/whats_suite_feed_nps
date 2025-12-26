// Represents an account/tenant; keeps consistency rules away from transport/storage layers.
export default class Tenant {
  constructor({ id, name, status = 'active', createdAt = new Date(), updatedAt = new Date() }) {
    if (!id || !name) {
      throw new Error('Tenant requires id and name');
    }
    this.id = id;
    this.name = name;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  deactivate() {
    this.status = 'inactive';
    this.updatedAt = new Date();
  }
}
