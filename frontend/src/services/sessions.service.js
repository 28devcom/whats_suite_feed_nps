import { apiClient } from '../api/client.js';

export const createSessionsService = ({ getToken, onUnauthorized }) => {
  const client = apiClient(getToken, { onUnauthorized });

  // Endpoint no disponible actualmente; devolvemos lista vacía para evitar 404 en consola.
  const listConversations = async () => [];

  const listMessages = async (conversationId, cursor) => {
    const params = new URLSearchParams({ conversationId });
    if (cursor) params.append('cursor', cursor);
    try {
      return await client.request(`/messaging/messages?${params.toString()}`);
    } catch (err) {
      if (err?.status === 404) return { messages: [], nextCursor: null };
      throw err;
    }
  };

  const createMessage = async (body) =>
    client.request('/messaging/messages', { method: 'POST', body });

  return { listConversations, listMessages, createMessage };
};
