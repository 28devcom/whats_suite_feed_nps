import { AppError } from '../shared/errors.js';
import { insertUser, listUsers as listUsersDb, findUserById as findUserByIdDb, updateUser as updateUserDb } from '../infra/db/models/userModel.js';
import { USER_ROLES, USER_STATUS } from '../domain/user/user.entity.js';
import { recordAuditLog } from '../infra/db/auditRepository.js';
import pool from '../infra/db/postgres.js';
import { forceLogout } from './authService.js';

const sanitizeUser = (user) => {
  if (!user) return null;
  const { id, name, email, username, role, status, createdAt, updatedAt } = user;
  return { id, name, email, username, role, status, createdAt, updatedAt };
};

const logUserEvent = async ({ actorId, action, targetId, ip, metadata }) => {
  await recordAuditLog({
    userId: actorId || null,
    action,
    resource: 'user',
    resourceId: targetId || null,
    ip: ip || null,
    userAgent: null,
    metadata: { targetId, ...metadata }
  });
};

const mapUniqueConstraint = (err) => {
  if (err?.code !== '23505') return null;
  if (err.detail?.toLowerCase().includes('email')) return 'EMAIL_TAKEN';
  if (err.detail?.toLowerCase().includes('username')) return 'USERNAME_TAKEN';
  return 'DUPLICATE';
};

const countActiveAdminsExcluding = async (excludeId = null) => {
  const params = [];
  let sql = `
    SELECT COUNT(1) AS total
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'ADMIN' AND u.status = 'ACTIVE'
  `;
  if (excludeId) {
    params.push(excludeId);
    sql += ` AND u.id <> $1`;
  }
  const { rows } = await pool.query(sql, params);
  return Number(rows[0]?.total || 0);
};

export const listUsers = async () => {
  const users = await listUsersDb();
  return users.map(sanitizeUser);
};

export const getUserById = async (id) => {
  const user = await findUserByIdDb(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return sanitizeUser(user);
};

export const createUser = async ({ name, email, username, password, role = USER_ROLES.AGENTE, status = USER_STATUS.ACTIVE, tenantId = null }, { actorId = null, ip = null } = {}) => {
  try {
    const user = await insertUser({ name, email, username, passwordPlain: password, role, status, tenantId });
    await logUserEvent({
      actorId,
      action: 'user_created',
      targetId: user.id,
      ip,
      metadata: { email, username, status, role, tenantId: tenantId || 'default' }
    });
    return sanitizeUser(user);
  } catch (err) {
    const mapped = mapUniqueConstraint(err);
    if (mapped === 'EMAIL_TAKEN') throw new AppError('Email ya está en uso', 409);
    if (mapped === 'USERNAME_TAKEN') throw new AppError('Username ya está en uso', 409);
    if (mapped === 'DUPLICATE') throw new AppError('Registro duplicado', 409);
    throw err;
  }
};

export const updateUser = async (id, { name, email, username, role, status }, { actorId = null, ip = null } = {}) => {
  try {
    const existing = await findUserByIdDb(id);
    if (!existing) throw new AppError('Usuario no encontrado', 404);

    if (actorId && status === USER_STATUS.INACTIVE && actorId === id) {
      throw new AppError('No puedes desactivar tu propio usuario', 403);
    }

    if (status === USER_STATUS.INACTIVE && existing.role === USER_ROLES.ADMIN) {
      const otherAdmins = await countActiveAdminsExcluding(id);
      if (otherAdmins < 1) {
        throw new AppError('No puedes desactivar al último administrador', 409);
      }
    }

    const user = await updateUserDb(id, { name, email, username, role, status });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    if (status === USER_STATUS.INACTIVE) {
      await forceLogout({ targetUserId: id, performedBy: actorId, ip, userAgent: null }).catch(() => {});
    }

    await logUserEvent({
      actorId,
      action: 'user_updated',
      targetId: id,
      ip,
      metadata: { name, email, username, role, status }
    });
    return sanitizeUser(user);
  } catch (err) {
    const mapped = mapUniqueConstraint(err);
    if (mapped === 'EMAIL_TAKEN') throw new AppError('Email ya está en uso', 409);
    if (mapped === 'USERNAME_TAKEN') throw new AppError('Username ya está en uso', 409);
    if (mapped === 'DUPLICATE') throw new AppError('Registro duplicado', 409);
    throw err;
  }
};

export const deleteUser = async (id, { actorId = null, ip = null, confirm = false } = {}) => {
  const existing = await findUserByIdDb(id);
  if (!existing) throw new AppError('Usuario no encontrado', 404);
  if (existing.status === USER_STATUS.ACTIVE && !confirm) {
    throw new AppError('Confirmar eliminación de usuario activo con confirm=true', 409);
  }
  if (existing.role === USER_ROLES.ADMIN) {
    const otherAdmins = await countActiveAdminsExcluding(id);
    if (otherAdmins < 1) {
      throw new AppError('No puedes eliminar al último administrador', 409);
    }
  }
  // Best-effort: revoca sesión y aplica soft delete
  await forceLogout({ targetUserId: id, performedBy: actorId, ip, userAgent: null }).catch(() => {});
  const deletedAt = new Date().toISOString();
  const user = await updateUserDb(id, { status: USER_STATUS.INACTIVE, deletedAt });
  await logUserEvent({
    actorId,
    action: 'user_deleted_soft',
    targetId: id,
    ip,
    metadata: { email: existing.email, username: existing.username, deletedAt }
  });
  return { deleted: true, soft: true };
};
