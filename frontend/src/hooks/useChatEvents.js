import { useEffect, useRef, useState } from 'react';
import { getEventsSocket } from '../lib/eventsSocket.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Suscribe a eventos de chat en tiempo real (namespace /events).
 * No contiene lógica de negocio; solo entrega callbacks de intención.
 */
export const useChatEvents = ({ onChatAssigned, onChatReassigned, onChatClosed, onMessageReceived, onMessageSent } = {}) => {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    if (!token) return;
    const socket = getEventsSocket(token);

    socketRef.current = socket;
    setStatus('connecting');

    const handleConnect = () => setStatus('connected');
    const handleDisconnect = () => setStatus('disconnected');
    const handleError = () => setStatus('error');
    const handleAssigned = (payload) => onChatAssigned?.(payload);
    const handleReassigned = (payload) => onChatReassigned?.(payload);
    const handleClosed = (payload) => onChatClosed?.(payload);
    const handleReceived = (payload) => onMessageReceived?.(payload);
    const handleSent = (payload) => onMessageSent?.(payload);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleError);
    socket.on('CHAT_ASSIGNED', handleAssigned);
    socket.on('CHAT_REASSIGNED', handleReassigned);
    socket.on('CHAT_CLOSED', handleClosed);
    socket.on('MESSAGE_RECEIVED', handleReceived);
    socket.on('MESSAGE_SENT', handleSent);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleError);
      socket.off('CHAT_ASSIGNED', handleAssigned);
      socket.off('CHAT_REASSIGNED', handleReassigned);
      socket.off('CHAT_CLOSED', handleClosed);
      socket.off('MESSAGE_RECEIVED', handleReceived);
      socket.off('MESSAGE_SENT', handleSent);
      setStatus('disconnected');
    };
  }, [token, onChatAssigned, onChatReassigned, onChatClosed, onMessageReceived, onMessageSent]);

  return { socket: socketRef.current, status };
};

export default useChatEvents;
