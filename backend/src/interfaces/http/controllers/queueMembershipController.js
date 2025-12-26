import httpStatus from 'http-status';
import {
  getQueueUsers,
  addUserToQueue,
  removeUserFromQueue,
  getQueueConnectionsService,
  addConnectionToQueue,
  removeConnectionFromQueue
} from '../../../services/queueMembershipService.js';

const ok = (data, message = 'OK', code = 'OK') => ({ success: true, data, message, code });

export const listQueueUsersController = async (req, res, next) => {
  try {
    const users = await getQueueUsers(req.params.id);
    res.status(httpStatus.OK).json(ok(users));
  } catch (err) {
    next(err);
  }
};

export const addQueueUserController = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const result = await addUserToQueue(req.params.id, { userId, role }, { id: req.user?.id, ip: req.ip });
    res.status(httpStatus.CREATED).json(ok(result, 'CREATED', 'CREATED'));
  } catch (err) {
    next(err);
  }
};

export const removeQueueUserController = async (req, res, next) => {
  try {
    const result = await removeUserFromQueue(req.params.id, req.params.userId, { id: req.user?.id, ip: req.ip });
    res.status(httpStatus.OK).json(ok(result, 'DELETED', 'DELETED'));
  } catch (err) {
    next(err);
  }
};

export const listQueueConnectionsController = async (req, res, next) => {
  try {
    const rows = await getQueueConnectionsService(req.params.id);
    res.status(httpStatus.OK).json(ok(rows));
  } catch (err) {
    next(err);
  }
};

export const addQueueConnectionController = async (req, res, next) => {
  try {
    const { sessionName } = req.body;
    const result = await addConnectionToQueue(req.params.id, sessionName, { id: req.user?.id, ip: req.ip });
    res.status(httpStatus.CREATED).json(ok(result, 'CREATED', 'CREATED'));
  } catch (err) {
    next(err);
  }
};

export const removeQueueConnectionController = async (req, res, next) => {
  try {
    const result = await removeConnectionFromQueue(req.params.id, req.params.sessionName, { id: req.user?.id, ip: req.ip });
    res.status(httpStatus.OK).json(ok(result, 'DELETED', 'DELETED'));
  } catch (err) {
    next(err);
  }
};
