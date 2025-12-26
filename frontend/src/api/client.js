const DEFAULT_TIMEOUT = 15000;
let API_VERSION = 'v1';

export const setApiVersion = (version) => {
  if (!version || typeof version !== 'string') return;
  API_VERSION = version.startsWith('v') ? version : `v${version}`;
};

const baseURL = () => `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api/${API_VERSION}`;

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const withTimeout = (promise, ms = DEFAULT_TIMEOUT) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new ApiError('Request timeout', 408)), ms))
  ]);

const buildUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseURL()}${cleanPath}`;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);
  return payload;
};

const ensureOk = (response, payload) => {
  if (response.ok) return;
  const message = payload?.error || payload?.message || response.statusText || 'Request failed';
  throw new ApiError(message, response.status, payload?.details || payload);
};

export const apiClient = (getToken, { onUnauthorized } = {}) => {
  const request = async (path, { method = 'GET', body, headers = {} } = {}) => {
    if (!path.startsWith('/')) {
      throw new ApiError('Path must start with "/" and include versioned route', 400);
    }
    const token = typeof getToken === 'function' ? getToken() : null;
    const opts = { method, headers: { ...headers, 'X-Requested-With': 'whatssuite-frontend' } };
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && body !== null) {
      if (isFormData) {
        opts.body = body;
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    if (token) {
      opts.headers.Authorization = `Bearer ${token}`;
    }
    const response = await withTimeout(fetch(buildUrl(path), opts));
    const payload = await parseResponse(response);
    if (response.status === 401 || response.status === 403) {
      if (onUnauthorized) await onUnauthorized(response);
    }
    ensureOk(response, payload);
    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
      if (payload.success === false) {
        throw new ApiError(payload.message || 'Request failed', response.status, payload);
      }
      return payload.data;
    }
    return payload;
  };

  return { request, buildUrl };
};
