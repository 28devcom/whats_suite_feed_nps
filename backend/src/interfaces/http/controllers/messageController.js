import httpStatus from 'http-status';
import { sendMessage } from '../../../services/chatMessageService.js';
import { deleteMessageService } from '../../../services/chatMessageEditService.js';

const ok = (data, message = 'OK', code = 'OK') => ({ success: true, data, message, code });

export const sendChatMessageCommandController = async (req, res, next) => {
  try {
    const { chatId, content } = req.body || {};
    const result = await sendMessage({ chatId, content, user: req.user, ip: req.ip });
    res.status(httpStatus.CREATED).json(ok(result, 'SENT', 'SENT'));
  } catch (err) {
    next(err);
  }
};

export const deleteMessageController = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const result = await deleteMessageService({
      messageId,
      user: req.user,
      ip: req.ip,
      userAgent: req.get('user-agent') || null
    });
    res.status(httpStatus.OK).json(ok(result, 'DELETED', 'DELETED'));
  } catch (err) {
    next(err);
  }
};
