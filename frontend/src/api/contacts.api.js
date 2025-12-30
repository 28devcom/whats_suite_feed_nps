import { apiClient } from './client.js';

export const createContactsApi = ({ getToken, onUnauthorized } = {}) => {
  const client = apiClient(getToken, { onUnauthorized });

  const getByPhone = async (phone) => {
    const safePhone = encodeURIComponent(phone);
    return client.request(`/contacts/by-phone/${safePhone}`, { method: 'GET' });
  };

  const upsert = async ({ phone, displayName, avatarRef, metadata }) =>
    client.request('/contacts/upsert', { method: 'POST', body: { phone, displayName, avatarRef, metadata } });

  return {
    getByPhone,
    upsert
  };
};

export default createContactsApi;
