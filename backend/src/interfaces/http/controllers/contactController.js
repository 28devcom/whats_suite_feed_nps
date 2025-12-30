import httpStatus from 'http-status';
import { getContactByPhoneService, upsertContactService } from '../../../services/contactService.js';

const ok = (data, message = 'OK', code = 'OK') => ({ success: true, data, message, code });

export const getContactByPhoneController = async (req, res, next) => {
  try {
    const { phone } = req.params;
    const contact = await getContactByPhoneService({ phone }, req.user);
    res.status(httpStatus.OK).json(ok(contact));
  } catch (err) {
    next(err);
  }
};

export const upsertContactController = async (req, res, next) => {
  try {
    const { phone, displayName, avatarRef, metadata } = req.body || {};
    const contact = await upsertContactService(
      { phone, displayName, avatarRef, metadata },
      req.user,
      { ip: req.ip, userAgent: req.headers['user-agent'] || null }
    );
    res.status(httpStatus.OK).json(ok(contact, 'UPSERTED', 'UPSERTED'));
  } catch (err) {
    next(err);
  }
};
