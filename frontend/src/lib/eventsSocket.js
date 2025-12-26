import { io } from 'socket.io-client';

let sharedSocket = null;
let sharedToken = null;

const buildBase = () => (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, '');

const dispatchAuthError = (reason = 'socket_auth_error') => {
  try {
    const evt = new CustomEvent('socket-auth-error', { detail: { reason } });
    window.dispatchEvent(evt);
  } catch (_) {
    // no-op
  }
};

export const getEventsSocket = (token) => {
  if (!token) return null;

  // Reuse existing socket if token matches and still connected/connecting
  if (sharedSocket && sharedToken === token) {
    return sharedSocket;
  }

  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }

  sharedToken = token;
  sharedSocket = io(`${buildBase()}/events`, {
    path: '/socket.io',
    auth: { token },
    query: { token },
    transports: ['websocket', 'polling'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
  });

  sharedSocket.on('connect_error', (err) => {
    const msg = err?.message || err?.data || '';
    if (/jwt expired|no autorizado|unauthorized/i.test(String(msg))) {
      dispatchAuthError('token_expired');
    }
  });

  return sharedSocket;
};

export const disconnectEventsSocket = () => {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    sharedToken = null;
  }
};

export default getEventsSocket;
