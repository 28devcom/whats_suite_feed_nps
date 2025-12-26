// Simple duration parser supporting s, m, h, d suffixes; defaults to seconds if no suffix.
export const toSeconds = (duration) => {
  if (typeof duration === 'number') return duration;
  if (!duration) return 0;
  const match = /^([0-9]+)\s*([smhd])?$/i.exec(duration.trim());
  if (!match) throw new Error('Invalid duration format');
  const value = Number.parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * multipliers[unit];
};
