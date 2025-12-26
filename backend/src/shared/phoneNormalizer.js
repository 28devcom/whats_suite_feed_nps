export const normalizeMexNumber = (digits) => {
  if (!digits) return digits;
  const only = String(digits).replace(/[^\d]/g, '');
  if (only.length === 10) return `521${only}`;
  if (only.startsWith('52') && !only.startsWith('521')) {
    const rest = only.slice(2);
    return `52${rest.startsWith('1') ? '' : '1'}${rest}`;
  }
  return only;
};
