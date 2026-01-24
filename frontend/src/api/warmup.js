import { apiClient } from './client.js';

export const warmupApi = (getToken, onUnauthorized) => {
  const client = apiClient(getToken, { onUnauthorized });

  return {
    getStatus: () => client.request('/warmup/status'),
    start: () => client.request('/warmup/start', { method: 'POST' }),
    pause: () => client.request('/warmup/pause', { method: 'POST' }),
    resume: () => client.request('/warmup/resume', { method: 'POST' }),
    toggleSimulate: (simulate) => client.request('/warmup/simulate', { method: 'POST', body: { simulate } }),
    runCycle: () => client.request('/warmup/run', { method: 'POST' }),
    listLines: () => client.request('/warmup/lines')
  };
};
