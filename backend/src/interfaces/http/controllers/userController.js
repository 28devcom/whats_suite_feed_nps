import httpStatus from 'http-status';
import { listUsers, getUserById, createUser, updateUser, deleteUser, changePassword } from '../../../services/userService.js';

const clientIp = (req) => (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();

const ok = (data, message = 'OK', code = 'OK') => ({ success: true, data, message, code });

export const listUsersController = async (req, res, next) => {
  try {
    const result = await listUsers();
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const getUserController = async (req, res, next) => {
  try {
    const result = await getUserById(req.params.id);
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const createUserController = async (req, res, next) => {
  try {
    const { name, email, username, password, role, status } = req.body;
    const result = await createUser(
      { name, email, username, password, role, status },
      { actorId: req.user?.id || null, ip: clientIp(req) }
    );
    res.status(httpStatus.CREATED).json(ok(result, 'CREATED', 'CREATED'));
  } catch (err) {
    next(err);
  }
};

export const updateUserController = async (req, res, next) => {
  try {
    const { name, email, username, role, status, password } = req.body;
    const result = await updateUser(
      req.params.id,
      { name, email, username, role, status, password },
      { actorId: req.user?.id || null, ip: clientIp(req) }
    );
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const deleteUserController = async (req, res, next) => {
  try {
    const confirm = String(req.query.confirm || '').toLowerCase() === 'true';
    const result = await deleteUser(req.params.id, {
      actorId: req.user?.id || null,
      ip: clientIp(req),
      confirm
    });
    res.status(httpStatus.OK).json(ok(result, 'DELETED', 'DELETED'));
  } catch (err) {
    next(err);
  }
};

export const changePasswordController = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const result = await changePassword({
      targetUserId: req.params.id,
      currentPassword,
      newPassword,
      actor: { id: req.user?.id, role: req.user?.role },
      ip: clientIp(req),
      userAgent: req.get('user-agent') || null
    });
    res.status(httpStatus.OK).json(ok(result, 'PASSWORD_UPDATED', 'PASSWORD_UPDATED'));
  } catch (err) {
    next(err);
  }
};
