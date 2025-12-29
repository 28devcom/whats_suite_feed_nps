import path from 'node:path';
import { promises as fs } from 'node:fs';
import env from '../../../config/env.js';
import { AppError } from '../../../shared/errors.js';
import crypto from 'node:crypto';
import { findMediaByRelativePath } from '../../../infra/db/chatMessageRepository.js';
import { getChatById, isUserInQueue } from '../../../infra/db/chatRepository.js';
import { ROLES } from '../../../domain/user/user.js';
import { verifyMediaSignature } from '../../../shared/mediaSignature.js';

const baseDir = path.resolve(process.cwd(), env.media.storageDir || 'storage/media');
const isEncryptionEnabled = env.media.encryptionEnabled && env.media.encryptionKey;

const decryptIfNeeded = (buffer) => {
  if (!isEncryptionEnabled) return buffer;
  const key = Buffer.from(env.media.encryptionKey, 'base64');
  if (key.length !== 32) {
    throw new Error('MEDIA_ENCRYPTION_KEY must be 32 bytes (base64 of 256-bit key)');
  }
  // saveMediaBuffer stores: [12 bytes IV][16 bytes authTag][ciphertext]
  if (buffer.length < 28) {
    throw new AppError('Archivo corrupto', 400);
  }
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const ciphertext = buffer.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted;
};

export const streamMediaController = async (req, res, next) => {
  try {
    const relPath = req.method === 'POST' ? req.body?.path : req.query.path;
    const sha = (req.method === 'POST' ? req.body?.sha : req.query.sha) || null;
    const sig = req.method === 'POST' ? req.body?.sig : req.query.sig;
    const exp = req.method === 'POST' ? req.body?.exp : req.query.exp;
    const user = req.user;
    if (!user) throw new AppError('No autorizado', 401);

    if (!relPath || typeof relPath !== 'string') throw new AppError('path requerido', 400);
    if (relPath.includes('..')) throw new AppError('Ruta inválida', 400);
    const signatureProvided = Boolean(sig || exp);

    const mediaRecord = await findMediaByRelativePath(relPath);
    if (mediaRecord) {
      const chat = await getChatById(mediaRecord.chatId);
      if (!chat) throw new AppError('Chat no encontrado', 404);
      // Control de acceso básico por rol/asignación/cola
      if (user.role === ROLES.AGENTE) {
        if (chat.assignedUserId && chat.assignedUserId !== user.id) {
          throw new AppError('Acceso denegado', 403);
        }
        if (chat.queueId) {
          const inQueue = await isUserInQueue(user.id, chat.queueId);
          if (!inQueue) throw new AppError('Acceso denegado', 403);
        }
      }
    }

    const fullPath = path.resolve(baseDir, relPath);
    if (!fullPath.startsWith(baseDir)) throw new AppError('Ruta fuera de almacenamiento', 400);
    let fileBuffer;
    try {
      fileBuffer = await fs.readFile(fullPath);
    } catch (err) {
      if (err?.code === 'ENOENT') throw new AppError('Archivo no encontrado', 404);
      throw err;
    }

    const storedSha = mediaRecord?.media?.sha256 || null;
    const effectiveSha = storedSha || sha || null;
    if (sha && storedSha && sha !== storedSha) throw new AppError('Hash no coincide', 400);

    // Decrypt if needed and validate hash against original content (not ciphertext)
    const dataBuffer = decryptIfNeeded(fileBuffer);

    if (effectiveSha) {
      const hash = crypto.createHash('sha256').update(dataBuffer).digest('hex');
      if (hash !== effectiveSha) throw new AppError('Archivo alterado', 400);
    }

    if (mediaRecord?.media?.mimeType) {
      res.setHeader('Content-Type', mediaRecord.media.mimeType);
    }
    res.setHeader('Cache-Control', 'private, max-age=0');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.end(dataBuffer);
  } catch (err) {
    next(err);
  }
};
