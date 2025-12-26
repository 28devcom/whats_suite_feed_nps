// Lógica WhatsApp eliminada — será reemplazada por nueva arquitectura persistente en PostgreSQL
export const ConnectionStatus = {
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  QR_READY: 'QR_READY',
  DISABLED: 'DISABLED',
  ERROR: 'ERROR'
};

export const initialState = {
  status: ConnectionStatus.DISABLED,
  lastError: null,
  details: null
};
