export const normalizePhoneNumber = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[^\d]/g, '');
};

export const normalizeWhatsAppNumber = (digits) => {
  if (!digits) return '';
  let only = normalizePhoneNumber(digits);
  if (!only) return '';
  if (only.length === 10) return `521${only}`; // compat MX local -> E.164 WhatsApp
  if (only.startsWith('52') && !only.startsWith('521')) {
    const rest = only.slice(2);
    return `521${rest}`;
  }
  if (only.length < 6 || only.length > 32) return '';
  return only;
};

export const normalizeMexNumber = (digits) => normalizeWhatsAppNumber(digits);
