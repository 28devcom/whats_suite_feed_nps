import { AppError } from '../shared/errors.js';
import bcrypt from 'bcrypt';
import {
  insertUser,
  listUsers as listUsersDb,
  findUserById as findUserByIdDb,
  updateUser as updateUserDb,
  deleteUserHard as deleteUserDb
} from '../infra/db/models/userModel.js';
import { USER_ROLES, USER_STATUS } from '../domain/user/user.entity.js';
import { recordAuditLog } from '../infra/db/auditRepository.js';
import pool from '../infra/db/postgres.js';
import { forceLogout } from './authService.js';
import { findById as findAuthUser } from '../infra/db/userRepository.js';
import { bulkUnassignChatsByUser } from '../infra/db/chatRepository.js';
import { recordChatAssignmentAudit } from '../infra/db/chatAssignmentAuditRepository.js';
import { recordChatAudit } from '../infra/db/chatAuditRepository.js';
import { cacheAssignment, invalidateChat } from '../infra/cache/chatCache.js';
import { emitToRoles } from '../infra/realtime/socketHub.js';
import { markDisconnectedByUserIds } from '../infra/db/userConnectionRepository.js';

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

export const updateUser = async (id, { name, email, username, role, status, password }, { actorId = null, ip = null } = {}) => {
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

    const passwordPlain = typeof password === 'string' && password.trim().length > 0 ? password : null;
    const user = await updateUserDb(id, { name, email, username, role, status, passwordPlain });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    if (status === USER_STATUS.INACTIVE) {
      await forceLogout({ targetUserId: id, performedBy: actorId, ip, userAgent: null }).catch(() => {});
    } else if (passwordPlain) {
      await forceLogout({ targetUserId: id, performedBy: actorId, ip, userAgent: null }).catch(() => {});
    }

    await logUserEvent({
      actorId,
      action: 'user_updated',
      targetId: id,
      ip,
      metadata: { name, email, username, role, status, passwordChanged: Boolean(passwordPlain) }
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

  // Revoca sesión y marca conexiones como desconectadas antes de tocar datos.
  await forceLogout({ targetUserId: id, performedBy: actorId, ip, userAgent: null }).catch(() => {});
  await markDisconnectedByUserIds([id]).catch(() => {});

  const client = await pool.connect();
  let chatsUnassigned = [];
  let conversationsCleared = 0;
  try {
    await client.query('BEGIN');

    // Desasigna todos los chats del usuario: quedan en estado UNASSIGNED salvo los cerrados.
    chatsUnassigned = await bulkUnassignChatsByUser(id, client);

    // Conversaciones heredadas (omni-channel): desasigna y abre si estaba asignado.
    const convRes = await client.query(
      `UPDATE conversations
       SET assigned_agent_id = NULL,
           status = CASE WHEN status = 'closed' THEN status ELSE 'open' END,
           updated_at = NOW()
       WHERE assigned_agent_id = $1
       RETURNING id`,
      [id]
    );
    conversationsCleared = convRes?.rowCount || 0;

    // Historial de asignaciones antiguas: permitir NULL para conservar trazabilidad sin bloquear el delete.
    await client.query('ALTER TABLE IF EXISTS conversation_assignment_history ALTER COLUMN agent_id DROP NOT NULL');
    await client.query('UPDATE conversation_assignment_history SET agent_id = NULL WHERE agent_id = $1', [id]);
    await client.query('UPDATE conversation_assignment_history SET assigned_by = NULL WHERE assigned_by = $1', [id]);

    // Limpiar FKs que no tienen ON DELETE SET NULL.
    await client.query('UPDATE auth_events SET user_id = NULL WHERE user_id = $1', [id]);
    await client.query('UPDATE audit_logs SET user_id = NULL WHERE user_id = $1', [id]);
    await client.query('UPDATE broadcast_templates SET created_by = NULL WHERE created_by = $1', [id]);
    await client.query('UPDATE broadcast_campaigns SET created_by = NULL WHERE created_by = $1', [id]);
    await client.query('UPDATE message_templates SET created_by = NULL WHERE created_by = $1', [id]);
    await client.query('UPDATE campaigns SET created_by = NULL WHERE created_by = $1', [id]);

    const deleted = await deleteUserDb(id, client);
    if (!deleted) throw new AppError('No se pudo eliminar el usuario', 500);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Auditoría central de la eliminación del usuario.
  await logUserEvent({
    actorId,
    action: 'user_deleted_hard',
    targetId: id,
    ip,
    metadata: {
      email: existing.email,
      username: existing.username,
      role: existing.role,
      chatsUnassigned: chatsUnassigned.length,
      conversationsCleared
    }
  });

  // Trazabilidad por chat y actualización de caché/emisiones.
  for (const chat of chatsUnassigned) {
    await cacheAssignment(chat.id, { assignedAgentId: null, assignedAt: null }).catch(() => {});
    await invalidateChat(chat.id).catch(() => {});
    await recordChatAssignmentAudit({
      chatId: chat.id,
      previousAgentId: existing.id,
      newAgentId: null,
      action: 'UNASSIGN',
      executedByUserId: actorId,
      reason: 'user_deleted',
      validatedQueue: chat.queueId ? true : null,
      fromConnectionId: chat.whatsappSessionName || chat.connectionId || null,
      toConnectionId: null
    }).catch(() => {});
    await recordChatAudit({
      actorUserId: actorId,
      action: 'chat_unassigned',
      chatId: chat.id,
      queueId: chat.queueId,
      ip,
      metadata: { reason: 'user_deleted', deletedUserId: id }
    }).catch(() => {});
    await emitToRoles(['ADMIN', 'SUPERVISOR'], 'chat:update', chat).catch(() => {});
  }

  return {
    deleted: true,
    hard: true,
    chatsUnassigned: chatsUnassigned.length,
    conversationsCleared
  };
};

export const changePassword = async ({ targetUserId, currentPassword, newPassword, actor = {}, ip = null, userAgent = null }) => {
  const target = await findAuthUser(targetUserId);
  if (!target) throw new AppError('Usuario no encontrado', 404);
  const isSelf = actor?.id === targetUserId;
  const isAdmin = actor?.role === USER_ROLES.ADMIN;
  const isSupervisor = actor?.role === USER_ROLES.SUPERVISOR;
  if (!isSelf && !isAdmin && !isSupervisor) {
    throw new AppError('No autorizado', 403);
  }
  const trimmedNew = (newPassword || '').trim();
  if (!trimmedNew || trimmedNew.length < 6) {
    throw new AppError('Contraseña mínima 6 caracteres', 400);
  }
  if (isSelf) {
    const match = await bcrypt.compare(currentPassword || '', target.passwordHash || '');
    if (!match) throw new AppError('Contraseña actual incorrecta', 401);
  }
  const updated = await updateUserDb(targetUserId, { passwordPlain: trimmedNew });
  if (!updated) throw new AppError('No se pudo actualizar la contraseña', 500);

  await forceLogout({ targetUserId, performedBy: actor?.id || null, ip, userAgent }).catch(() => {});

  await logUserEvent({
    actorId: actor?.id || null,
    action: 'user_password_changed',
    targetId: targetUserId,
    ip,
    metadata: { self: isSelf, byAdmin: isAdmin || isSupervisor }
  });

  return sanitizeUser(updated);
};
