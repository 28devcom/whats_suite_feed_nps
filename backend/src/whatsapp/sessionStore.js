// Lógica WhatsApp eliminada — será reemplazada por nueva arquitectura persistente en PostgreSQL
// Stubs sin efectos colaterales para mantener compatibilidad mientras se reconstruye el flujo.

export const saveSession = async () => {};
export const loadSession = async () => null;
export const invalidateSession = async () => {};
export const hasValidSession = async () => false;
export const markSessionConnected = async () => {};

// Compatibilidad con nombres previos
export const saveCreds = async () => {};
export const loadCreds = async () => null;
export const hasSession = async () => false;
export const clearSession = async () => {};

export const saveKeys = async () => {};
export const loadKeys = async () => new Map();

export const signalStoreAdapter = () => ({
  async get() {
    return {};
  },
  async set() {
    return;
  },
  async delete() {
    return;
  }
});

export const listValidSessions = async () => [];
