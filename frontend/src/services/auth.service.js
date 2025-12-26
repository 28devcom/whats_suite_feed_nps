import { apiClient } from '../api/client.js';

export const createAuthService = ({ getToken, onUnauthorized }) => {
  const client = apiClient(getToken, { onUnauthorized });

  const login = async (email, password) => client.request('/auth/login', { method: 'POST', body: { email, password } });
  const logout = async () => client.request('/auth/logout', { method: 'POST' });
  const me = async () => client.request('/auth/me');

  return { login, logout, me, client };
};
