// Lógica WhatsApp eliminada — será reemplazada por nueva arquitectura persistente en PostgreSQL
// Stub de manager sin conexiones ni listeners activos.
import { ConnectionStatus, initialState } from './connectionState.js';

class WhatsAppManager {
  constructor() {
    this.state = { ...initialState, qr: null };
    this.connectionId = null;
  }

  getStatus() {
    return { ...this.state };
  }

  async start(connectionId) {
    this.connectionId = connectionId || null;
    this.state = {
      status: ConnectionStatus.DISABLED,
      lastError: null,
      details: 'WhatsApp module disabled during rebuild',
      qr: null
    };
    return this.getStatus();
  }

  async stop() {
    this.connectionId = null;
    this.state = { ...initialState, qr: null };
    return this.getStatus();
  }
}

export default new WhatsAppManager();
