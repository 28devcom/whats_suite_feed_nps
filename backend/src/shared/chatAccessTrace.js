export const buildChatAccessTrace = ({ action = null, reason = null, chat = null, user = null, queueIds = null, extra = null } = {}) => {
  const trace = {
    flag: 'chat_access_denied',
    action,
    reason,
    chatId: chat?.id || null,
    chatStatus: chat?.status || null,
    chatQueueId: chat?.queueId || null,
    assignedAgentId: chat?.assignedAgentId || null,
    assignedUserId: chat?.assignedUserId || null,
    sessionName: chat?.whatsappSessionName || null,
    remoteNumber: chat?.remoteNumber || null,
    userId: user?.id || null,
    userRole: user?.role || null,
    userQueues: queueIds || null,
    tenantId: user?.tenantId || null
  };
  if (extra && typeof extra === 'object' && Object.keys(extra).length) {
    trace.extra = extra;
  }
  return trace;
};
