const boolFlag = (key, defaultValue) => {
  const raw = import.meta.env[key];
  if (raw === undefined) return defaultValue;
  return raw === 'true' || raw === true;
};

const featureFlags = {
  campaigns: boolFlag('VITE_FLAG_CAMPAIGNS', true),
  whatsappConnections: boolFlag('VITE_FLAG_WHATSAPP_CONNECTIONS', true),
  auditExports: boolFlag('VITE_FLAG_AUDIT_EXPORTS', false)
};

export default featureFlags;
