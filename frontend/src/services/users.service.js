import { apiClient } from '../api/client.js';

export const createUsersService = ({ getToken, onUnauthorized } = {}) => {
  const client = apiClient(getToken, { onUnauthorized });

  const getUsers = async () => client.request('/users', { method: 'GET' });

  const getUserById = async (id) => client.request(`/users/${id}`, { method: 'GET' });

  const createUser = async (data) => client.request('/users', { method: 'POST', body: data });

  const updateUser = async (id, data) => client.request(`/users/${id}`, { method: 'PUT', body: data });

  const deleteUser = async (id, { confirm = false } = {}) =>
    client.request(`/users/${id}?confirm=${confirm}`, { method: 'DELETE' });

  return { getUsers, getUserById, createUser, updateUser, deleteUser };
};

export default createUsersService;
