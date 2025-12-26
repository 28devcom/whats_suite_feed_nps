import httpStatus from 'http-status';
import {
  createQuickReplyService,
  deleteQuickReplyService,
  listQuickRepliesService,
  sendQuickReplyService,
  updateQuickReplyService
} from './quickReply.service.js';

const ok = (data, message = 'OK', code = 'OK') => ({ success: true, data, message, code });

export const listQuickRepliesController = async (req, res, next) => {
  try {
    const { search, cursor, limit, active } = req.query;
    const result = await listQuickRepliesService({
      userId: req.user?.id,
      search,
      cursor,
      limit: limit ? Number(limit) : undefined,
      activeOnly: active !== undefined ? active === 'true' || active === true : false
    });
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const createQuickReplyController = async (req, res, next) => {
  try {
    const quickReply = await createQuickReplyService(req.body, req.user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.CREATED).json(ok(quickReply, 'CREATED', 'CREATED'));
  } catch (err) {
    next(err);
  }
};

export const updateQuickReplyController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quickReply = await updateQuickReplyService(id, req.body, req.user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.OK).json(ok(quickReply, 'UPDATED', 'UPDATED'));
  } catch (err) {
    next(err);
  }
};

export const deleteQuickReplyController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quickReply = await deleteQuickReplyService(id, req.user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.OK).json(ok(quickReply, 'DELETED', 'DELETED'));
  } catch (err) {
    next(err);
  }
};

export const sendQuickReplyController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { chatId, variables } = req.body || {};
    const result = await sendQuickReplyService(
      { quickReplyId: id, chatId, variables },
      req.user,
      { ip: req.ip, userAgent: req.headers['user-agent'] || null }
    );
    res.status(httpStatus.CREATED).json(ok(result, 'SENT', 'SENT'));
  } catch (err) {
    next(err);
  }
};
