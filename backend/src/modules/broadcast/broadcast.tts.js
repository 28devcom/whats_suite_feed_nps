import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import googleTTS from 'google-tts-api';
import logger from '../../infra/logging/logger.js';
import { AppError } from '../../shared/errors.js';
import env from '../../config/env.js';

const execFileAsync = promisify(execFile);

const downloadTtsMp3 = async (text, { voice = 'es', speed = 1 } = {}) => {
  const lang = voice || 'es';
  const slow = Number(speed || 1) < 0.95;
  const hosts = ['https://translate.googleapis.com', 'https://translate.google.com'];
  let lastErr = null;
  for (const host of hosts) {
    try {
      const url = googleTTS.getAudioUrl(text, {
        lang,
        slow,
        host
      });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const array = await res.arrayBuffer();
      return Buffer.from(array);
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  throw new AppError(`No se pudo obtener audio TTS (${lastErr?.message || 'network'})`, 502);
};

export const synthesizeVoiceNote = async (text, { voice = 'es', speed = 1 } = {}) => {
  if (!text || typeof text !== 'string') {
    throw new AppError('Texto TTS inválido', 400);
  }
  if (!ffmpegPath) {
    throw new AppError('ffmpeg no disponible para TTS', 500);
  }
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'broadcast-tts-'));
  const mp3Path = path.join(tmpDir, 'voice.mp3');
  const oggPath = path.join(tmpDir, 'voice.ogg');
  try {
    const mp3Buffer = await downloadTtsMp3(text, { voice, speed });
    if (mp3Buffer.length > env.media.maxBytes) {
      throw new AppError('Audio TTS supera el límite configurado', 400);
    }
    await fs.writeFile(mp3Path, mp3Buffer, { mode: 0o600 });
    await execFileAsync(ffmpegPath, ['-y', '-i', mp3Path, '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '64k', oggPath]);
    const buffer = await fs.readFile(oggPath);
    if (buffer.length > env.media.maxBytes) {
      throw new AppError('Audio TTS final supera el límite configurado', 400);
    }
    return { buffer, mimeType: 'audio/ogg; codecs=opus', extension: 'ogg' };
  } catch (err) {
    logger.error({ err, tag: 'BROADCAST_TTS' }, 'TTS synthesis failed');
    throw new AppError('No se pudo sintetizar audio TTS', 500);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
};
