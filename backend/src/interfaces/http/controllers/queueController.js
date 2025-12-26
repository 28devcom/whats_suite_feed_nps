import httpStatus from 'http-status';
import {
  getQueues,
  createQueueService,
  updateQueueService,
  deleteQueueService,
  getQueueByIdService
} from '../../../services/queueService.js';

const ok = (data, message = 'OK', code = 'OK') => ({ success: true, data, message, code });

export const listQueuesController = async (_req, res, next) => {
  try {
    const result = await getQueues();
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const getQueueController = async (req, res, next) => {
  try {
    const result = await getQueueByIdService(req.params.id);
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const createQueueController = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const result = await createQueueService({ name, description }, { id: req.user?.id, ip: req.ip });
    res.status(httpStatus.CREATED).json(ok(result, 'CREATED', 'CREATED'));
  } catch (err) {
    next(err);
  }
};

export const updateQueueController = async (req, res, next) => {
  try {
    const { name, description, active } = req.body;
    const result = await updateQueueService(req.params.id, { name, description, active }, { id: req.user?.id, ip: req.ip });
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const deleteQueueController = async (req, res, next) => {
  try {
    const result = await deleteQueueService(req.params.id, { id: req.user?.id, ip: req.ip });
    res.status(httpStatus.OK).json(ok(result, 'DELETED', 'DELETED'));
  } catch (err) {
    next(err);
  }
};
