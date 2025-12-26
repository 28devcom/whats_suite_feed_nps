import { apiClient } from '../api/client.js';

export const createQueueMembershipService = ({ getToken, onUnauthorized } = {}) => {
  const client = apiClient(getToken, { onUnauthorized });

  const listQueueUsers = async (queueId) => client.request(`/queues/${queueId}/users`, { method: 'GET' });
  const listQueueConnections = async (queueId) => client.request(`/queues/${queueId}/whatsapp`, { method: 'GET' });
  const listAllUsers = async () => client.request('/users', { method: 'GET' });

  return { listQueueUsers, listQueueConnections, listAllUsers };
};

export default createQueueMembershipService;
