import { useMemo } from 'react';
import createChatService from '../services/chat.service.js';
import { useAuth } from '../context/AuthContext.jsx';

export const useChatApi = () => {
  const { token, logout } = useAuth();
  const service = useMemo(
    () =>
      createChatService({
        getToken: () => token,
        onUnauthorized: async () => logout({ remote: false, reason: 'Sesión expirada o inválida' })
      }),
    [token, logout]
  );
  return service;
};

export default useChatApi;
