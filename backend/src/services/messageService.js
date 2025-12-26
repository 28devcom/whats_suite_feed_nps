import { AppError } from '../shared/errors.js';
import { getConversation, createConversation, listConversations } from '../infra/db/conversationRepository.js';
import {
  createMessageWithPayload,
  listMessages,
  getMessageById,
  appendEvent,
  updateStatus as updateMessageStatus
} from '../infra/db/messageRepository.js';
import pool from '../infra/db/postgres.js';

const ensureConversation = async (conversationId, fallbackName) => {
  const conv = await getConversation(conversationId);
  if (!conv) {
    throw new AppError('Conversación no encontrada', 404);
  }
  return conv;
};

const getUserQueueIds = async (userId) => {
  const { rows } = await pool.query('SELECT queue_id FROM queue_users WHERE user_id = $1', [userId]);
  return rows.map((r) => r.queue_id);
};

export const canViewChat = async (user, conversation) => {
  if (!user || !conversation) return false;
  const queueIds = await getUserQueueIds(user.id);
  const belongsToQueue = conversation.queueId && queueIds.includes(conversation.queueId);
  if (!belongsToQueue) return false;

  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
    return true;
  }

  // AGENTE: solo chats asignados a él o sin asignar dentro de sus colas
  const isAgent = user.role === 'AGENTE';
  if (isAgent) {
    const assignedToSelf = conversation.assignedAgentId && conversation.assignedAgentId === user.id;
    const unassigned = !conversation.assignedAgentId;
    return assignedToSelf || unassigned;
  }
  return false;
};

const ensureVisibility = async (user, conversation) => {
  const allowed = await canViewChat(user, conversation);
  if (!allowed) {
    throw new AppError('No autorizado a ver este chat', 403);
  }
};

export const createConversationIfMissing = async ({ name, whatsappSessionId, metadata }) => {
  return createConversation({ name, whatsappSessionId, metadata });
};

export const getConversations = async ({ limit, offset, user }) => {
  const convs = await listConversations({ limit, offset });
  if (!user) return convs;
  const result = [];
  const queueIds = await getUserQueueIds(user.id);
  for (const conv of convs) {
    const belongsToQueue = conv.queueId && queueIds.includes(conv.queueId);
    if (!belongsToQueue) continue;
    if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
      result.push(conv);
      continue;
    }
    // AGENTE
    const assignedToSelf = conv.assignedAgentId && conv.assignedAgentId === user.id;
    const unassigned = !conv.assignedAgentId;
    if (assignedToSelf || unassigned) {
      result.push(conv);
    }
  }
  return result;
};

export const ingestMessage = async ({
  conversationId,
  externalId,
  direction,
  sender,
  recipient,
  messageType,
  payload,
  payloadType,
  storageUrl,
  checksum,
  sizeBytes,
  attachments
}, user) => {
  const conv = await ensureConversation(conversationId);
  await ensureVisibility(user, conv);
  const msg = await createMessageWithPayload({
    conversationId,
    externalId,
    direction,
    sender,
    recipient,
    messageType,
    status: 'received',
    payload,
    payloadType,
    storageUrl,
    checksum,
    sizeBytes,
    attachments
  });
  return msg;
};

export const getMessages = async ({ conversationId, limit, cursor }, user) => {
  const conv = await ensureConversation(conversationId);
  await ensureVisibility(user, conv);
  const messages = await listMessages({ conversationId, limit, cursor });
  const nextCursor = messages.length ? messages[messages.length - 1].createdAt : null;
  return { messages, nextCursor };
};

export const getMessage = async (id, user) => {
  const message = await getMessageById(id);
  if (!message) throw new AppError('Mensaje no encontrado', 404);
  // ensure visibility via conversation
  const conv = await ensureConversation(message.conversationId);
  await ensureVisibility(user, conv);
  return message;
};

export const markDelivered = async (id) => {
  await updateMessageStatus(id, 'delivered');
  await appendEvent(id, 'delivered', {});
};

export const markFailed = async (id, reason) => {
  await updateMessageStatus(id, 'failed');
  await appendEvent(id, 'failed', { reason });
};
