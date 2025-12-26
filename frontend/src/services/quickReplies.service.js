import { apiClient } from '../api/client.js';

const createQuickRepliesService = ({ getToken, onUnauthorized } = {}) => {
  const client = apiClient(getToken, { onUnauthorized });

  const list = async ({ search, cursor, limit, active } = {}) => {
    const qs = new URLSearchParams();
    if (search !== undefined && search !== null) qs.set('search', search);
    if (cursor) qs.set('cursor', cursor);
    if (limit) qs.set('limit', limit);
    if (active !== undefined) qs.set('active', active);
    const path = qs.toString() ? `/quick-replies?${qs.toString()}` : '/quick-replies';
    return client.request(path, { method: 'GET' });
  };

  const create = async (payload) => client.request('/quick-replies', { method: 'POST', body: payload });

  const update = async (id, payload) => client.request(`/quick-replies/${id}`, { method: 'PUT', body: payload });

  const remove = async (id) => client.request(`/quick-replies/${id}`, { method: 'DELETE' });

  const send = async (id, payload) => client.request(`/quick-replies/${id}/send`, { method: 'POST', body: payload });

  return { list, create, update, remove, send };
};

export default createQuickRepliesService;
