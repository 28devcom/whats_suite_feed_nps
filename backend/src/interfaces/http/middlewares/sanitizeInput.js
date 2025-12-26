const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;
const stripControlChars = (value) => value.replace(CONTROL_CHARS_REGEX, '');

const sanitizeValue = (val) => {
  if (typeof val === 'string') {
    const sanitized = stripControlChars(val).trim();
    return sanitized.length > 8000 ? sanitized.slice(0, 8000) : sanitized;
  }
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val && typeof val === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      clean[k] = sanitizeValue(v);
    }
    return clean;
  }
  return val;
};

const sanitizeContainer = (container) => {
  if (!container || typeof container !== 'object') return container;
  for (const [key, value] of Object.entries(container)) {
    container[key] = sanitizeValue(value);
  }
  return container;
};

const sanitizeInput = (req, _res, next) => {
  sanitizeContainer(req.body);
  sanitizeContainer(req.query);
  sanitizeContainer(req.params);
  next();
};

export default sanitizeInput;
