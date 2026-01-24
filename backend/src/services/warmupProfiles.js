// Perfiles de calentamiento por numero: ajustan ritmo, intensidad y tono.
export const WARMUP_PROFILES = {
  nuevo: {
    key: 'nuevo',
    dailyLimit: 12,
    minIntervalMs: 30 * 60 * 1000, // 30 min entre ciclos
    turnsPerConversation: 4,
    emojiChance: 0.15,
    typoChance: 0.06,
    longBias: 0.35,
    timingOverrides: {
      baseDelaySeconds: [7, 18],
      longPauseSeconds: [90, 180],
      longPauseChance: 0.3
    }
  },
  tibio: {
    key: 'tibio',
    dailyLimit: 18,
    minIntervalMs: 20 * 60 * 1000,
    turnsPerConversation: 6,
    emojiChance: 0.22,
    typoChance: 0.08,
    longBias: 0.45,
    timingOverrides: {
      baseDelaySeconds: [5, 16],
      longPauseSeconds: [70, 160],
      longPauseChance: 0.25
    }
  },
  estable: {
    key: 'estable',
    dailyLimit: 30,
    minIntervalMs: 10 * 60 * 1000,
    turnsPerConversation: 8,
    emojiChance: 0.25,
    typoChance: 0.08,
    longBias: 0.5,
    timingOverrides: {
      baseDelaySeconds: [4, 14],
      longPauseSeconds: [60, 140],
      longPauseChance: 0.18
    }
  },
  recuperacion: {
    key: 'recuperacion',
    dailyLimit: 8,
    minIntervalMs: 45 * 60 * 1000,
    turnsPerConversation: 4,
    emojiChance: 0.12,
    typoChance: 0.05,
    longBias: 0.3,
    timingOverrides: {
      baseDelaySeconds: [9, 22],
      longPauseSeconds: [120, 240],
      longPauseChance: 0.35
    }
  }
};

const DEFAULT_PROFILE_KEY = 'estable';

export const resolveProfile = (lineOrKey, fallback = DEFAULT_PROFILE_KEY) => {
  const key =
    typeof lineOrKey === 'string'
      ? lineOrKey.toLowerCase()
      : (lineOrKey?.profile || lineOrKey?.warmupProfile || fallback || DEFAULT_PROFILE_KEY).toLowerCase();
  return WARMUP_PROFILES[key] || WARMUP_PROFILES[fallback] || WARMUP_PROFILES[DEFAULT_PROFILE_KEY];
};

export const defaultProfileKey = DEFAULT_PROFILE_KEY;

export default WARMUP_PROFILES;
