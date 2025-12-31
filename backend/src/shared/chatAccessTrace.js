import { getLatestChatAssignmentAudit } from '../infra/db/chatAssignmentAuditRepository.js';
import { getLatestChatAudit } from '../infra/db/chatAuditRepository.js';

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
    assignedAt: chat?.assignedAt || null,
    closedAt: chat?.closedAt || null,
    updatedAt: chat?.updatedAt || null,
    lastMessageAt: chat?.lastMessageAt || null,
    reassignedAt: chat?.reassignedAt || null,
    reassignedByUserId: chat?.reassignedByUserId || null,
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

export const buildChatAccessTraceWithAudit = async (params = {}) => {
  const trace = buildChatAccessTrace(params);
  if (!trace.chatId) return trace;
  const [assignment, audit] = await Promise.all([
    getLatestChatAssignmentAudit(trace.chatId).catch(() => null),
    getLatestChatAudit(trace.chatId).catch(() => null)
  ]);
  if (assignment) trace.lastAssignment = assignment;
  if (audit) trace.lastAudit = audit;
  return trace;
};
