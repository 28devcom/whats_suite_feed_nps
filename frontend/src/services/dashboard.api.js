import { apiClient } from '../api/client.js';

export const createDashboardApi = ({ getToken, onUnauthorized } = {}) => {
  const client = apiClient(getToken, { onUnauthorized });

  const getDashboardOverview = async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.fecha_inicio) qs.set('fecha_inicio', params.fecha_inicio);
    if (params.fecha_fin) qs.set('fecha_fin', params.fecha_fin);
    const url = qs.toString() ? `/dashboard/overview?${qs.toString()}` : '/dashboard/overview';
    return client.request(url, { method: 'GET' });
  };

  const getDashboardMessages = async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.fecha_inicio) qs.set('fecha_inicio', params.fecha_inicio);
    if (params.fecha_fin) qs.set('fecha_fin', params.fecha_fin);
    const url = qs.toString() ? `/dashboard/messages?${qs.toString()}` : '/dashboard/messages';
    return client.request(url, { method: 'GET' });
  };

  const getDashboardChats = async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.fecha_inicio) qs.set('fecha_inicio', params.fecha_inicio);
    if (params.fecha_fin) qs.set('fecha_fin', params.fecha_fin);
    const url = qs.toString() ? `/dashboard/chats?${qs.toString()}` : '/dashboard/chats';
    return client.request(url, { method: 'GET' });
  };

  const getDashboardDrilldown = async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.fecha_inicio) qs.set('fecha_inicio', params.fecha_inicio);
    if (params.fecha_fin) qs.set('fecha_fin', params.fecha_fin);
    if (params.level) qs.set('level', params.level);
    const url = qs.toString() ? `/dashboard/drilldown?${qs.toString()}` : '/dashboard/drilldown';
    return client.request(url, { method: 'GET' });
  };

  return {
    getDashboardOverview,
    getDashboardMessages,
    getDashboardChats,
    getDashboardDrilldown
  };
};

export default createDashboardApi;
