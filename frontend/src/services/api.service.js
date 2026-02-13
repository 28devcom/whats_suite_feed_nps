import { apiClient } from '../api/client.js';

export const createApiService = ({ getToken, onUnauthorized } = {}) => {
  const client = apiClient(getToken, { onUnauthorized });

  return {
    get: (url) => client.request(url, { method: 'GET' }),
    post: (url, data) => client.request(url, { method: 'POST', body: data }),
    put: (url, data) => client.request(url, { method: 'PUT', body: data }),
    patch: (url, data) => client.request(url, { method: 'PATCH', body: data }),
    delete: (url) => client.request(url, { method: 'DELETE' }),
  };
};

export default createApiService;
