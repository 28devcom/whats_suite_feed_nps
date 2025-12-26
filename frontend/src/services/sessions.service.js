import { apiClient } from '../api/client.js';

export const createSessionsService = ({ getToken, onUnauthorized }) => {
  const client = apiClient(getToken, { onUnauthorized });

  const listConversations = async () => client.request('/messaging/conversations');
  const listMessages = async (conversationId, cursor) => {
    const params = new URLSearchParams({ conversationId });
    if (cursor) params.append('cursor', cursor);
    return client.request(`/messaging/messages?${params.toString()}`);
  };
  const createMessage = async (body) =>
    client.request('/messaging/messages', { method: 'POST', body });

  return { listConversations, listMessages, createMessage };
};
