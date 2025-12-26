import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import env from '../../config/env.js';

const sanitizeExt = (mimeType) => {
  if (!mimeType || typeof mimeType !== 'string') return '';
  const ext = mimeType.split('/')[1] || '';
  return ext.replace(/[^a-zA-Z0-9]/g, '');
};

const getCipher = () => {
  if (!env.media.encryptionEnabled || !env.media.encryptionKey) return null;
  const key = Buffer.from(env.media.encryptionKey, 'base64');
  if (key.length !== 32) {
    throw new Error('MEDIA_ENCRYPTION_KEY must be 32 bytes (base64 of 256-bit key)');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  return { cipher, iv };
};

/**
 * Guarda buffer en storage jerárquico por hash.
 * Path: /media/{year}/{month}/{hash_prefix}/{file_id}
 * - file_id es el sha256 (deduplicación).
 * - No guardamos binarios en DB; se retorna metadata.
 */
export const saveMediaBuffer = async ({ buffer, mimeType }) => {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear()).padStart(4, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');

  const baseDir = path.resolve(process.cwd(), env.media.storageDir || 'storage/media');
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const hashPrefix = sha256.slice(0, 6);
  const fileId = sha256; // dedupe by hash
  const ext = sanitizeExt(mimeType);
  const targetDir = path.join(baseDir, yyyy, mm, hashPrefix);
  await fs.mkdir(targetDir, { recursive: true });

  const fileName = ext ? `${fileId}.${ext}` : fileId;
  const fullPath = path.join(targetDir, fileName);

  const encryptor = getCipher();
  if (encryptor) {
    const encrypted = Buffer.concat([encryptor.cipher.update(buffer), encryptor.cipher.final()]);
    const authTag = encryptor.cipher.getAuthTag();
    const payload = Buffer.concat([encryptor.iv, authTag, encrypted]);
    await fs.writeFile(fullPath, payload, { flag: 'wx', mode: 0o600 }).catch(async (err) => {
      if (err?.code !== 'EEXIST') throw err;
      // dedupe: if already exists, keep existing file
    });
  } else {
    await fs.writeFile(fullPath, buffer, { flag: 'wx', mode: 0o600 }).catch(async (err) => {
      if (err?.code !== 'EEXIST') throw err;
    });
  }
  return {
    path: fullPath,
    fileId,
    fileName,
    sha256,
    size: buffer.length,
    mimeType,
    relativePath: path.relative(baseDir, fullPath)
  };
};
