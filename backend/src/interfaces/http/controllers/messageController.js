import {
  createConversationIfMissing,
  getConversations,
  ingestMessage,
  getMessages,
  getMessage,
  markDelivered,
  markFailed
} from '../../../services/messageService.js';
import { sendMessage } from '../../../services/chatMessageService.js';
import { AppError } from '../../../shared/errors.js';

export const createConversationController = async (req, res, next) => {
  try {
    const { name, whatsappSessionId, metadata } = req.body;
    const conv = await createConversationIfMissing({ name, whatsappSessionId, metadata });
    res.status(201).json(conv);
  } catch (err) {
    next(err);
  }
};

export const listConversationsController = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const convs = await getConversations({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      user: req.user
    });
    res.json(convs);
  } catch (err) {
    next(err);
  }
};

export const ingestMessageController = async (req, res, next) => {
  try {
    const message = await ingestMessage(req.body, req.user);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

export const listMessagesController = async (req, res, next) => {
  try {
    const { conversationId, limit, cursor } = req.query;
    const result = await getMessages({ conversationId, limit: limit ? Number(limit) : undefined, cursor }, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getMessageController = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const message = await getMessage(messageId, req.user);
    res.json(message);
  } catch (err) {
    next(err);
  }
};

export const markDeliveredController = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    await markDelivered(messageId);
    res.status(202).json({ message: 'Marcado como entregado' });
  } catch (err) {
    next(err);
  }
};

export const markFailedController = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body || {};
    await markFailed(messageId, reason || 'unknown');
    res.status(202).json({ message: 'Marcado como fallido' });
  } catch (err) {
    next(err);
  }
};

export const sendChatMessageCommandController = async (req, res, next) => {
  try {
    const { chatId, content } = req.body || {};
    if (!chatId || !content) {
      throw new AppError('chatId y content son requeridos', 400);
    }
    // El frontend solo envía intención; backend decide permisos y metadatos.
    const result = await sendMessage({ chatId, content, user: req.user, ip: req.ip });
    res.status(201).json({ success: true, data: result, message: 'SENT' });
  } catch (err) {
    next(err);
  }
};
