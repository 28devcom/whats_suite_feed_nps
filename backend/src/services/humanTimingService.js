import crypto from 'node:crypto';
import env from '../config/env.js';

const defaults = {
  baseDelaySeconds: [4, 18],
  longPauseSeconds: [60, 240],
  longPauseChance: 0.2,
  jitterSeconds: [1, 6],
  typingCharsPerSec: [6, 14],
  typingMinMs: 500,
  activeHours: [{ start: '08:00', end: '22:00' }],
  nightResumeJitterSeconds: [15, 180]
};

const randomInt = (min, max) => crypto.randomInt(min, max + 1);
const randomFloat = () => crypto.randomInt(0, 10_000) / 10_000;
const pickRange = ([min, max]) => randomInt(min, max);

const parseHmToMinutes = (hm) => {
  if (typeof hm === 'number' && Number.isFinite(hm)) return hm;
  if (hm instanceof Date) return hm.getHours() * 60 + hm.getMinutes();
  const raw = typeof hm === 'string' ? hm : '';
  const [h, m] = raw.split(':').map((v) => Number.parseInt(v, 10));
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
};

const normalizeWindows = (activeHours) =>
  (activeHours || defaults.activeHours).map((w) => {
    if (typeof w?.start === 'number' && typeof w?.end === 'number') {
      return { start: w.start, end: w.end };
    }
    return {
      start: parseHmToMinutes(w?.start ?? '08:00'),
      end: parseHmToMinutes(w?.end ?? '22:00')
    };
  });

const minutesOfDay = (d) => d.getHours() * 60 + d.getMinutes();

const isWithinWindow = (minute, window) => {
  if (window.start <= window.end) {
    return minute >= window.start && minute < window.end;
  }
  // Overnight window (e.g. 22:00-02:00)
  return minute >= window.start || minute < window.end;
};

const isWithinActive = (date, windows) => {
  const m = minutesOfDay(date);
  return windows.some((w) => isWithinWindow(m, w));
};

const dateAtMinutes = (base, minutes, dayOffset = 0) => {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
};

const findNextStart = (now, windows) => {
  const mNow = minutesOfDay(now);
  const sorted = [...windows].sort((a, b) => a.start - b.start);

  for (const w of sorted) {
    if (isWithinWindow(mNow, w)) {
      return now; // already inside
    }
    if (w.start > mNow && w.start <= 1440) {
      return dateAtMinutes(now, w.start, 0);
    }
  }
  // none remaining today; pick first window tomorrow
  return dateAtMinutes(now, sorted[0].start, 1);
};

const pickDelaySeconds = ({ isLong, config }) => {
  const useLong = isLong || randomFloat() < config.longPauseChance;
  const base = useLong ? config.longPauseSeconds : config.baseDelaySeconds;
  const jitter = pickRange(config.jitterSeconds);
  return pickRange(base) + jitter;
};

const computeTypingMs = (text = '', { typingCharsPerSec, typingMinMs }) => {
  const cps = pickRange(typingCharsPerSec);
  const length = Math.max(1, (text || '').length);
  const ms = Math.round((length / cps) * 1000);
  const jitter = randomInt(100, 600);
  return Math.max(typingMinMs, ms + jitter);
};

/**
 * Calcula delay humano para un mensaje: delay antes de enviar, typing previo y respeto a horarios activos.
 */
export const computeHumanDelay = ({
  text = '',
  isLong = false,
  now = new Date(),
  config: cfg = {}
} = {}) => {
  const config = { ...defaults, ...cfg };
  config.activeHours = normalizeWindows(config.activeHours);

  const delaySeconds = pickDelaySeconds({ isLong, config });
  const typingMs = computeTypingMs(text, config);
  const target = new Date(now.getTime() + delaySeconds * 1000);

  let sendAt = target;
  if (!isWithinActive(target, config.activeHours)) {
    const nextStart = findNextStart(target, config.activeHours);
    const resumeJitter = pickRange(config.nightResumeJitterSeconds);
    sendAt = new Date(nextStart.getTime() + resumeJitter * 1000);
  }

  const typingStartAt = new Date(sendAt.getTime() - typingMs);
  return {
    delayMs: Math.max(0, sendAt.getTime() - now.getTime()),
    typingMs,
    typingStartAt,
    sendAt,
    meta: {
      topic: 'human-timing',
      longPause: delaySeconds >= Math.min(...config.longPauseSeconds),
      activeWindow: config.activeHours
    }
  };
};

/**
 * Crea una configuracion flexible para distintos tenants o experimentos.
 */
export const buildTimingConfig = (overrides = {}) => ({
  ...defaults,
  ...overrides,
  activeHours: normalizeWindows(overrides.activeHours || defaults.activeHours)
});

export default computeHumanDelay;
