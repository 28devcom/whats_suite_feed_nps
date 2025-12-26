import { apiClient } from '../api/client.js';

export const createSettingsService = ({ getToken, onUnauthorized } = {}) => {
  const client = apiClient(getToken, { onUnauthorized });

  const getChatSettings = async () => client.request('/settings/chat', { method: 'GET' });

  const updateChatSettings = async (payload) =>
    client.request('/settings/chat', { method: 'PUT', body: payload });

  return { getChatSettings, updateChatSettings };
};

export default createSettingsService;
