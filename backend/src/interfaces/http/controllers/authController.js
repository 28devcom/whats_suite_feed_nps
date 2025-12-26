import { login, logout, forceLogout, hashPassword } from '../../../services/authService.js';
import { createUser, findById } from '../../../infra/db/userRepository.js';
import { auditAction } from '../../../services/auditService.js';
import { AppError } from '../../../shared/errors.js';

const clientMeta = (req) => ({
  ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim(),
  userAgent: req.headers['user-agent'] || 'unknown'
});

export const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const meta = clientMeta(req);
    const result = await login({ email, password, ...meta });
    await auditAction({ userId: result.user.id, action: 'login', resource: 'auth', ip: meta.ip, userAgent: meta.userAgent });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const logoutController = async (req, res, next) => {
  try {
    const meta = clientMeta(req);
    await logout({ userId: req.user.id, jti: req.user.jti, ...meta });
    await auditAction({ userId: req.user.id, action: 'logout', resource: 'auth', ip: meta.ip, userAgent: meta.userAgent });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const meController = async (req, res, next) => {
  try {
    const user = await findById(req.user.id);
    if (!user) throw new AppError('Usuario no encontrado', 404);
    res.json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role });
  } catch (err) {
    next(err);
  }
};

export const forceLogoutController = async (req, res, next) => {
  try {
    const meta = clientMeta(req);
    const { userId } = req.params;
    await forceLogout({ targetUserId: userId, performedBy: req.user.id, ...meta });
    await auditAction({ userId: req.user.id, action: 'force_logout', resource: 'user', resourceId: userId, ip: meta.ip, userAgent: meta.userAgent });
    res.status(202).json({ message: 'Sesión revocada' });
  } catch (err) {
    next(err);
  }
};

export const createUserController = async (req, res, next) => {
  try {
    const { email, fullName, password, role } = req.body;
    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, fullName, passwordHash, role });
    await auditAction({ userId: req.user?.id, action: 'create_user', resource: 'user', resourceId: user.id });
    res.status(201).json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role });
  } catch (err) {
    if (err?.code === '23505') {
      next(new AppError('Email ya registrado', 409));
    } else {
      next(err);
    }
  }
};
