import { AppError } from '../shared/errors.js';
import { buildChatAccessTrace } from '../shared/chatAccessTrace.js';
import {
  findMessageByUniqueKey,
  findMessageByWhatsappId,
  softDeleteMessage,
  getMessageById
} from '../infra/db/chatMessageRepository.js';
import { getChatById, isUserInQueue } from '../infra/db/chatRepository.js';
import { emitToUsers, emitToRoles } from '../infra/realtime/socketHub.js';
import { recordAuditLog } from '../infra/db/auditRepository.js';
import { ROLES } from '../domain/user/user.js';
import { sendWhatsAppMessage } from './whatsappService.js';

const isUuid = (val) => typeof val === 'string' && /^[0-9a-fA-F-]{36}$/.test(val);

const accessError = (message, trace, code = 'CHAT_MESSAGE_DELETE_DENIED') => new AppError(message, 403, trace, code);

const ensureVisibility = async (chat, user) => {
  if (!chat || !user) {
    throw accessError(
      'No autorizado',
      buildChatAccessTrace({ action: 'chat_message_delete', reason: 'missing_chat_or_user', chat, user })
    );
  }
  if (user.role === ROLES.ADMIN || user.role === ROLES.SUPERVISOR) return true;
  if (user.role === ROLES.AGENTE) {
    if (chat.assignedAgentId === user.id) return true;
    if (chat.queueId) {
      const inQueue = await isUserInQueue(user.id, chat.queueId);
      if (inQueue) return true;
    }
  }
  const reason =
    user.role === ROLES.AGENTE && chat.assignedAgentId && chat.assignedAgentId !== user.id
      ? 'agent_not_owner'
      : chat.queueId
        ? 'out_of_queue'
        : 'role_not_allowed';
  throw accessError(
    'No autorizado',
    buildChatAccessTrace({ action: 'chat_message_delete', reason, chat, user })
  );
};

const loadMessageByIdOrWhatsapp = async (messageId) => {
  let msg = null;
  if (isUuid(messageId)) {
    msg = await getMessageById(messageId);
    if (msg) return msg;
  }
  msg = await findMessageByWhatsappId(messageId);
  if (msg) return msg;
  msg = await findMessageByUniqueKey({ whatsappMessageId: messageId });
  return msg;
};

export const deleteMessageService = async ({ messageId, user, ip = null, userAgent = null }) => {
  const msg = await loadMessageByIdOrWhatsapp(messageId);
  if (!msg) throw new AppError('Mensaje no encontrado', 404);
  const chat = await getChatById(msg.chatId);
  await ensureVisibility(chat, user);

  // Marcar como eliminado para cliente pero conservar contenido
  const deleted = await softDeleteMessage({
    sessionName: msg.whatsappSessionName,
    remoteNumber: msg.remoteNumber,
    whatsappMessageId: msg.whatsappMessageId
  });
  if (!deleted) throw new AppError('No se pudo eliminar el mensaje', 500);

  if (msg.whatsappSessionName && msg.whatsappMessageId) {
    sendWhatsAppMessage({
      sessionName: msg.whatsappSessionName,
      remoteNumber: msg.remoteNumber,
      content: {
        delete: {
          remoteJid: `${msg.remoteNumber}@s.whatsapp.net`,
          fromMe: true,
          id: msg.whatsappMessageId
        }
      }
    }).catch(() => {});
  }

  const payload = { ...deleted, deletedForRemote: true };
  await emitToUsers([chat.assignedAgentId].filter(Boolean), 'message:update', payload);
  await emitToRoles([ROLES.ADMIN, ROLES.SUPERVISOR], 'message:update', payload);

  await recordAuditLog({
    userId: user.id,
    action: 'chat_message_deleted_remote',
    resource: 'chat_message',
    resourceId: msg.id,
    ip,
    userAgent,
    metadata: { chatId: chat.id, whatsappMessageId: msg.whatsappMessageId }
  }).catch(() => {});

  return payload;
};
