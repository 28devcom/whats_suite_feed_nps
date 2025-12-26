import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, apiClient } from '../api/client.js';
import { disconnectEventsSocket } from '../lib/eventsSocket.js';

const storageKey = 'whatssuite-auth';

const AuthContext = createContext(null);

const loadStoredSession = () => {
  const sources = [
    { type: 'local', store: localStorage },
    { type: 'session', store: sessionStorage }
  ];
  for (const source of sources) {
    try {
      const raw = source.store.getItem(storageKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      return { ...parsed, storageType: source.type };
    } catch (_) {
      // ignore parse errors and continue
    }
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ user: null, token: null, initializing: true, reason: null });
  const [storageType, setStorageType] = useState('local');
  const client = useMemo(
    () =>
      apiClient(
        () => state.token,
        {
          onUnauthorized: async () => {
            await logout({ remote: false, reason: 'Sesión expirada o inválida' });
          }
        }
      ),
    [state.token]
  );

  const persist = useCallback((user, token, remember = true) => {
    const payload = { user, token };
    if (remember) {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      sessionStorage.removeItem(storageKey);
      setStorageType('local');
    } else {
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
      localStorage.removeItem(storageKey);
      setStorageType('session');
    }
    setState({ user, token, initializing: false, reason: null });
  }, []);

  const clearSession = useCallback((reason = null) => {
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
    setState({ user: null, token: null, initializing: false, reason });
  }, []);

  const logout = useCallback(
    async ({ remote = true, reason = null } = {}) => {
      if (remote && state.token) {
        try {
          await client.request('/auth/logout', { method: 'POST' });
        } catch (_) {
          // ignore remote logout failures
        }
      }
      disconnectEventsSocket();
      clearSession(reason);
    },
    [state.token, clearSession, client]
  );

  const fetchMe = useCallback(
    async (tokenOverride = null) => {
      const tempClient = tokenOverride
        ? apiClient(
            () => tokenOverride,
            {
              onUnauthorized: async () => {
                await logout({ remote: false, reason: 'Sesión expirada o inválida' });
              }
            }
          )
        : client;
      const profile = await tempClient.request('/auth/me');
      return profile;
    },
    [client, logout]
  );

  const login = useCallback(async (email, password, remember = true) => {
    const result = await client.request('/auth/login', { method: 'POST', body: { email, password } });
    persist(result.user, result.token, remember);
    return result.user;
  }, [persist, client]);

  const authorizedFetch = useCallback(
    async (path, options = {}) => {
      const cleanPath = path.startsWith('/api/v1') ? path.replace('/api/v1', '') : path;
      const data = await client.request(cleanPath, options);
      return data;
    },
    [client]
  );

  useEffect(() => {
    const bootstrap = async () => {
      const stored = loadStoredSession();
      if (!stored?.token) {
        setState((prev) => ({ ...prev, initializing: false }));
        return;
      }
      try {
        const profile = await fetchMe(stored.token);
        persist(profile, stored.token, stored.storageType !== 'session');
      } catch (err) {
        const reason = err instanceof ApiError && err.status === 401 ? 'Sesión expirada o revocada' : 'No se pudo validar la sesión';
        clearSession(reason);
      }
    };
    bootstrap();
  }, [clearSession, fetchMe, persist]);

  // Desloguear si el socket notifica token expirado/no autorizado
  useEffect(() => {
    const handler = () => logout({ remote: false, reason: 'Sesión expirada o inválida' });
    window.addEventListener('socket-auth-error', handler);
    return () => window.removeEventListener('socket-auth-error', handler);
  }, [logout]);

  const value = useMemo(() => ({
    user: state.user,
    token: state.token,
    initializing: state.initializing,
    reason: state.reason,
    login,
    logout,
    authorizedFetch,
    apiClientInstance: client
  }), [state, login, logout, authorizedFetch, client]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
