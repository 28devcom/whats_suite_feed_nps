import { apiClient } from '../api/client.js';

export const createWhatsappService = ({ getToken, onUnauthorized }) => {
  const client = apiClient(getToken, { onUnauthorized });

  const createSession = async (sessionId = 'default') =>
    client.request('/whatsapp/sessions', { method: 'POST', body: { sessionName: sessionId } });
  const listSessions = async () => client.request('/whatsapp/sessions');
  const getStatus = async (sessionId = 'default') =>
    client.request(`/whatsapp/sessions/${sessionId}/status`);
  const getQr = async (sessionId = 'default') =>
    client.request(`/whatsapp/sessions/${sessionId}/qr`);
  const requestPairingCode = async (sessionId = 'default', phoneNumber) =>
    client.request(`/whatsapp/sessions/${sessionId}/pairing-code`, { method: 'POST', body: { phoneNumber } });
  const reconnect = async (sessionId = 'default') =>
    client.request(`/whatsapp/sessions/${sessionId}/reconnect`, { method: 'POST' });
  const disconnect = async (sessionId = 'default') =>
    client.request(`/whatsapp/sessions/${sessionId}/disconnect`, { method: 'POST' });

  return {
    createSession,
    listSessions,
    getStatus,
    getQr,
    requestPairingCode,
    reconnect,
    disconnect
  };
};
