import httpStatus from 'http-status';
import { getChatSettings, updateChatSettings } from '../../../services/systemSettingsService.js';

const ok = (data, message = 'OK', code = 'OK') => ({ success: true, data, message, code });

export const getChatSettingsController = async (req, res, next) => {
  try {
    const settings = await getChatSettings(req.user);
    res.status(httpStatus.OK).json(ok(settings));
  } catch (err) {
    next(err);
  }
};

export const updateChatSettingsController = async (req, res, next) => {
  try {
    const updated = await updateChatSettings(req.user, req.body || {}, { ip: req.ip, userAgent: req.get('user-agent') || null });
    res.status(httpStatus.OK).json(ok(updated, 'UPDATED', 'UPDATED'));
  } catch (err) {
    next(err);
  }
};
