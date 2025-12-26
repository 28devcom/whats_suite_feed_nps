import { manualAssign, autoAssign, changeStatus, getAssignmentHistory, getStatusHistory } from '../../../services/assignmentService.js';

export const manualAssignController = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { agentId, reason } = req.body;
    const assignedBy = req.user?.id;
    await manualAssign({ conversationId, agentId, assignedBy, reason });
    res.status(202).json({ message: 'Asignación realizada', agentId });
  } catch (err) {
    next(err);
  }
};

export const autoAssignController = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { agentIds } = req.body;
    const assignedBy = req.user?.id;
    const agentId = await autoAssign({ conversationId, candidateAgentIds: agentIds, assignedBy });
    res.status(202).json({ message: 'Asignación automática realizada', agentId });
  } catch (err) {
    next(err);
  }
};

export const changeStatusController = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { status, details } = req.body;
    await changeStatus({ conversationId, status, details });
    res.status(202).json({ message: 'Estado actualizado', status });
  } catch (err) {
    next(err);
  }
};

export const assignmentHistoryController = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const history = await getAssignmentHistory(conversationId);
    res.json(history);
  } catch (err) {
    next(err);
  }
};

export const statusHistoryController = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const history = await getStatusHistory(conversationId);
    res.json(history);
  } catch (err) {
    next(err);
  }
};
