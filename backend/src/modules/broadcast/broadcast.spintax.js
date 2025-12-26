const pattern = /\{([^{}]+)\}/;

export const resolveSpintax = (text) => {
  if (typeof text !== 'string' || !text.includes('{')) return text || '';
  let output = text;
  let guard = 0;
  while (pattern.test(output) && guard < 50) {
    output = output.replace(pattern, (_match, body) => {
      const options = body.split('|').filter((opt) => opt !== undefined && opt !== null);
      if (!options.length) return '';
      const choice = options[Math.floor(Math.random() * options.length)];
      return resolveSpintax(choice);
    });
    guard += 1;
  }
  return output;
};

const applyField = (obj, key) => {
  if (!obj || typeof obj !== 'object') return;
  if (typeof obj[key] === 'string') {
    obj[key] = resolveSpintax(obj[key]);
  }
};

export const applySpintaxPayload = (payload = {}) => {
  const clone = JSON.parse(JSON.stringify(payload || {}));
  applyField(clone, 'text');
  applyField(clone, 'body');
  applyField(clone, 'caption');
  if (clone.tts && typeof clone.tts === 'object') {
    applyField(clone.tts, 'text');
  }
  if (clone.media && typeof clone.media === 'object') {
    applyField(clone.media, 'caption');
  }
  return clone;
};
