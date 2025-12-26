export const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
};

export const isValidArray = (value) => Array.isArray(value) && value.length > 0;

export const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export const guard = (condition, message = 'Estado inválido') => {
  if (!condition) {
    throw new Error(message);
  }
};
