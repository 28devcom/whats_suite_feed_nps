export const createAuditService = () => {
  const sendEvent = async () => Promise.resolve(); // auditoría desactivada
  return { sendEvent };
};
