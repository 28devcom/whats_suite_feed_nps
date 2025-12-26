import { ApiError } from './client.js';

export const sendBroadcastApi = async (client, payload) => {
  const res = await client.request('/broadcast/send', { method: 'POST', body: payload });
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const listBroadcastHistoryApi = async (client) => {
  const res = await client.request('/broadcast/history');
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const listBroadcastTemplatesApi = async (client) => {
  const res = await client.request('/broadcast/templates');
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const createBroadcastTemplateApi = async (client, payload) => {
  const res = await client.request('/broadcast/templates', { method: 'POST', body: payload });
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const deleteBroadcastTemplateApi = async (client, id) => {
  const res = await client.request(`/broadcast/templates/${id}`, { method: 'DELETE' });
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};

export const getBroadcastDetailApi = async (client, id) => {
  const res = await client.request(`/broadcast/history/${id}`);
  if (!res) throw new ApiError('Respuesta inválida', 400);
  return res;
};
