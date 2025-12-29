import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { createSessionsService } from '../services/sessions.service.js';
import { getEventsSocket } from '../lib/eventsSocket.js';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { token, initializing, authorizedFetch } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const socketRef = useRef(null);
  const cursorRef = useRef({});
  const sessionsService = useMemo(
    () =>
      createSessionsService({
        getToken: () => token,
        onUnauthorized: async () => {
          // handled in AuthContext's apiClient; no-op here
        }
      }),
    [token]
  );

  const connectSocket = useCallback(() => {
    if (!token) return;
    const socket = getEventsSocket(token);
    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));
    socket.on('connect_error', () => setSocketStatus('error'));

    socket.on('message:new', (evt) => {
      if (!evt?.conversationId) return;
      setMessages((prev) => {
        const list = prev[evt.conversationId] || [];
        return { ...prev, [evt.conversationId]: [...list, evt.message] };
      });
    });

    socket.on('whatsapp:status', (evt) => {
      if (!evt?.sessionId) return;
      setConversations((prev) =>
        prev.map((c) => (c.whatsappSessionId === evt.sessionId ? { ...c, whatsappStatus: evt.status } : c))
      );
    });

    socket.on('message:update', (evt) => {
      if (!evt?.chatId || !evt?.whatsappMessageId) return;
      setMessages((prev) => {
        const existing = prev[evt.chatId] || [];
        const next = existing.map((m) =>
          m.whatsappMessageId === evt.whatsappMessageId || m.id === evt.messageId
            ? { ...m, status: evt.status || m.status, timestamp: evt.timestamp || m.timestamp }
            : m
        );
        return { ...prev, [evt.chatId]: next };
      });
    });

    socketRef.current = socket;
  }, [token]);

  useEffect(() => {
    connectSocket();
    return () => {
      // shared socket; solo removemos referencia local
      socketRef.current = null;
    };
  }, [connectSocket]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setLoadingConversations(true);
    try {
      const data = await sessionsService.listConversations();
      const list = Array.isArray(data) ? data : [];
      setConversations(list);
      if (!activeConversationId && list[0]?.id) {
        setActiveConversationId(list[0].id);
      }
    } finally {
      setLoadingConversations(false);
    }
  }, [sessionsService, activeConversationId, token]);

  const loadMessages = useCallback(
    async (conversationId, { append = false } = {}) => {
      if (!conversationId) return;
      setLoadingMessages(true);
      try {
        const cursor = append ? cursorRef.current[conversationId] : undefined;
        const query = new URLSearchParams({ conversationId });
        if (cursor) query.append('cursor', cursor);
        const result = await sessionsService.listMessages(conversationId, cursor);
        const list = result.messages || [];
        cursorRef.current[conversationId] = result.nextCursor || null;
        setMessages((prev) => {
          const existing = append ? prev[conversationId] || [] : [];
          const merged = append ? [...existing, ...list] : list;
          return { ...prev, [conversationId]: merged };
        });
      } finally {
        setLoadingMessages(false);
      }
    },
    [sessionsService]
  );

  useEffect(() => {
    if (!token || initializing) return;
    loadConversations().catch(() => {});
  }, [loadConversations, token, initializing]);

  useEffect(() => {
    if (activeConversationId && token && !initializing) {
      loadMessages(activeConversationId).catch(() => {});
    }
  }, [activeConversationId, loadMessages, token, initializing]);

  const sendMessage = useCallback(
    async ({ text, files = [] }) => {
      if (!activeConversationId) throw new Error('No conversation selected');
      const attachments = files.map((file) => ({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageUrl: URL.createObjectURL(file)
      }));
      const payloadType = files.length ? 'media' : 'text';
      const payload = files.length ? { text, attachments: attachments.map((a) => ({ fileName: a.fileName })) } : { text };
      const message = await sessionsService.createMessage({
        conversationId: activeConversationId,
        direction: 'outbound',
        sender: 'agent',
        recipient: 'customer',
        messageType: files.length ? 'media' : 'text',
        payloadType,
        payload,
        attachments
      });
      setMessages((prev) => {
        const list = prev[activeConversationId] || [];
        return { ...prev, [activeConversationId]: [...list, message] };
      });
      if (socketRef.current) {
        socketRef.current.emit('message:sent', { conversationId: activeConversationId, messageId: message.id });
      }
      return message;
    },
    [activeConversationId, sessionsService]
  );

  const value = useMemo(
    () => ({
      conversations,
      activeConversationId,
      setActiveConversationId,
      messages,
      loadingMessages,
      loadingConversations,
      loadMessages,
      sendMessage,
      socketStatus
    }),
    [conversations, activeConversationId, messages, loadingMessages, loadingConversations, loadMessages, sendMessage, socketStatus]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
