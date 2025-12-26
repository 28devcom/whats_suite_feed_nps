import crypto from 'node:crypto';
import env from '../config/env.js';

const secret = env.media.signingSecret;

const base64url = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

export const signMediaPath = ({ path, sha256 = '', expiresInSeconds = 900 }) => {
  const exp = Math.floor(Date.now() / 1000) + Math.max(60, expiresInSeconds);
  const payload = `${path}|${sha256 || ''}|${exp}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('base64');
  return { sig: base64url(hmac), exp };
};

export const verifyMediaSignature = ({ path, sha256 = '', sig, exp }) => {
  if (!sig || !exp) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now > Number(exp)) return false;
  const payload = `${path}|${sha256 || ''}|${exp}`;
  const expected = base64url(crypto.createHmac('sha256', secret).update(payload).digest('base64'));
  return expected === sig;
};
