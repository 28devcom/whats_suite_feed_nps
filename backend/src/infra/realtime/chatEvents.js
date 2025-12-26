import { emitToAgentRoom, emitToRoleRoom } from './socketHub.js';
import { ROLES } from '../../domain/user/user.js';

const sanitizeChat = (chat) => ({
  id: chat.id,
  status: chat.status,
  queueId: chat.queueId,
  assignedAgentId: chat.assignedAgentId || null,
  lastMessageAt: chat.lastMessageAt || chat.updatedAt || chat.createdAt,
  updatedAt: chat.updatedAt,
  createdAt: chat.createdAt
});

const sanitizeMessage = (message) => ({
  id: message.id,
  chatId: message.chatId,
  direction: message.direction,
  messageType: message.messageType || message.content?.type || 'unknown',
  timestamp: message.timestamp || message.createdAt,
  createdAt: message.createdAt,
  whatsappMessageId: message.whatsappMessageId || null
});

const emitToSupervision = (event, payload) => {
  emitToRoleRoom(ROLES.ADMIN, event, payload);
  emitToRoleRoom(ROLES.SUPERVISOR, event, payload);
};

export const emitChatAssignedEvent = (chat) => {
  if (!chat) return;
  const safe = sanitizeChat(chat);
  // Debug log
  // chat assigned
  if (chat.assignedAgentId) {
    emitToAgentRoom(chat.assignedAgentId, 'CHAT_ASSIGNED', safe);
  }
  emitToSupervision('CHAT_ASSIGNED', safe);
};

export const emitChatReassignedEvent = ({ chat, fromAgentId, toAgentId }) => {
  if (!chat) return;
  const safe = { ...sanitizeChat(chat), fromAgentId: fromAgentId || null, toAgentId: toAgentId || chat.assignedAgentId || null };
  // chat reassigned
  if (toAgentId) emitToAgentRoom(toAgentId, 'CHAT_REASSIGNED', safe);
  if (fromAgentId && fromAgentId !== toAgentId) emitToAgentRoom(fromAgentId, 'CHAT_REASSIGNED', { ...safe, removed: true });
  emitToSupervision('CHAT_REASSIGNED', safe);
};

export const emitChatClosedEvent = (chat) => {
  if (!chat) return;
  const safe = sanitizeChat(chat);
  // chat closed
  if (chat.assignedAgentId) {
    emitToAgentRoom(chat.assignedAgentId, 'CHAT_CLOSED', safe);
  }
  emitToSupervision('CHAT_CLOSED', safe);
};

export const emitMessageSentEvent = ({ chat, message }) => {
  if (!chat || !message) return;
  const payload = { chat: sanitizeChat(chat), message: sanitizeMessage(message) };
  // message sent
  if (chat.assignedAgentId) emitToAgentRoom(chat.assignedAgentId, 'MESSAGE_SENT', payload);
  emitToSupervision('MESSAGE_SENT', payload);
};

export const emitMessageReceivedEvent = ({ chat, message }) => {
  if (!chat || !message) return;
  const payload = { chat: sanitizeChat(chat), message: sanitizeMessage(message) };
  // message received
  if (chat.assignedAgentId) {
    emitToAgentRoom(chat.assignedAgentId, 'MESSAGE_RECEIVED', payload);
  } else {
    // Chat sin asignar: solo supervisión (regla de visibilidad)
    emitToSupervision('MESSAGE_RECEIVED', payload);
  }
  emitToSupervision('MESSAGE_RECEIVED', payload);
};
