import { ApiError } from './client.js';

export const createSessionApi = async (client, sessionId = 'default') => {
  const res = await client.request('/whatsapp/sessions', {
    method: 'POST',
    body: { sessionName: sessionId }
  });
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const listSessionsApi = async (client) => {
  const res = await client.request('/whatsapp/sessions');
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const getSessionStatusApi = async (client, sessionId = 'default') => {
  const res = await client.request(`/whatsapp/sessions/${sessionId}/status`);
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const getSessionQrApi = async (client, sessionId = 'default') => {
  const res = await client.request(`/whatsapp/sessions/${sessionId}/qr`);
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const requestPairingCodeApi = async (client, sessionId = 'default', phoneNumber) => {
  const res = await client.request(`/whatsapp/sessions/${sessionId}/pairing-code`, {
    method: 'POST',
    body: { phoneNumber }
  });
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const reconnectSessionApi = async (client, sessionId = 'default') => {
  const res = await client.request(`/whatsapp/sessions/${sessionId}/reconnect`, { method: 'POST' });
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const renewQrSessionApi = async (client, sessionId = 'default') => {
  const res = await client.request(`/whatsapp/sessions/${sessionId}/renew-qr`, { method: 'POST' });
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const disconnectSessionApi = async (client, sessionId = 'default') => {
  const res = await client.request(`/whatsapp/sessions/${sessionId}/disconnect`, { method: 'POST' });
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const deleteSessionApi = async (client, sessionId = 'default') => {
  const res = await client.request(`/whatsapp/sessions/${sessionId}`, { method: 'DELETE' });
  // Algunos endpoints devuelven 204 sin body; en ese caso consideramos éxito.
  return res === undefined || res === null || res === '' ? { success: true } : res;
};

export const updateSessionSettingsApi = async (client, sessionId = 'default', body = {}) => {
  const res = await client.request(`/whatsapp/sessions/${sessionId}/settings`, {
    method: 'PATCH',
    body
  });
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};
