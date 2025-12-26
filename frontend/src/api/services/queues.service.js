import { apiClient } from '../../api/client.js';

export const createQueuesService = ({ getToken, onUnauthorized } = {}) => {
  const client = apiClient(getToken, { onUnauthorized });

  const getQueues = async () => client.request('/queues', { method: 'GET' });
  const createQueue = async (data) => client.request('/queues', { method: 'POST', body: data });
  const updateQueue = async (id, data) => client.request(`/queues/${id}`, { method: 'PUT', body: data });
  const deleteQueue = async (id) => client.request(`/queues/${id}`, { method: 'DELETE' });

  const getQueueUsers = async (queueId) => client.request(`/queues/${queueId}/users`, { method: 'GET' });
  const addUserToQueue = async (queueId, userId) =>
    client.request(`/queues/${queueId}/users`, { method: 'POST', body: { userId } });
  const removeUserFromQueue = async (queueId, userId) =>
    client.request(`/queues/${queueId}/users/${userId}`, { method: 'DELETE' });

  const getQueueWhatsApps = async (queueId) => client.request(`/queues/${queueId}/whatsapp`, { method: 'GET' });
  const addWhatsAppToQueue = async (queueId, sessionName) =>
    client.request(`/queues/${queueId}/whatsapp`, { method: 'POST', body: { sessionName } });
  const removeWhatsAppFromQueue = async (queueId, sessionName) =>
    client.request(`/queues/${queueId}/whatsapp/${sessionName}`, { method: 'DELETE' });

  // Helpers para selects: lista completa de usuarios y sesiones WhatsApp disponibles
  const listAllUsers = async () => client.request('/users', { method: 'GET' });
  const listWhatsappSessions = async () => client.request('/whatsapp/sessions', { method: 'GET' });

  return {
    getQueues,
    createQueue,
    updateQueue,
    deleteQueue,
    getQueueUsers,
    addUserToQueue,
    removeUserFromQueue,
    getQueueWhatsApps,
    addWhatsAppToQueue,
    removeWhatsAppFromQueue,
    listAllUsers,
    listWhatsappSessions
  };
};

export default createQueuesService;
