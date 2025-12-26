import env from '../config/env.js';

import { signMediaPath } from './mediaSignature.js';

export const buildMediaUrl = (media) => {
  if (!media?.relativePath) return null;
  const { sig, exp } = signMediaPath({ path: media.relativePath, sha256: media.sha256 || null });
  const params = new URLSearchParams({ path: media.relativePath, sig, exp: String(exp) });
  if (media.sha256) params.set('sha', media.sha256);
  return `/api/v1/media?${params.toString()}`;
};
