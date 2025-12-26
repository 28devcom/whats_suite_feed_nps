import httpStatus from 'http-status';
import {
  getOverviewMetrics,
  getMessagesTimeseries,
  getChatsByQueue,
  logDashboardAccess,
  getDrilldown
} from './dashboard.service.js';

const ok = (data) => ({ success: true, data });

const requireDates = (req) => {
  const { fecha_inicio, fecha_fin } = req.query || {};
  if (!fecha_inicio || !fecha_fin) {
    const err = new Error('fecha_inicio y fecha_fin son obligatorios');
    err.status = httpStatus.BAD_REQUEST;
    throw err;
  }
  return { fecha_inicio, fecha_fin };
};

export const overviewController = async (req, res, next) => {
  try {
    const dates = requireDates(req);
    await logDashboardAccess({ userId: req.user.id, endpoint: req.path, ...dates });
    const data = await getOverviewMetrics(dates);
    res.status(httpStatus.OK).json(ok(data));
  } catch (err) {
    next(err);
  }
};

export const messagesController = async (req, res, next) => {
  try {
    const dates = requireDates(req);
    await logDashboardAccess({ userId: req.user.id, endpoint: req.path, ...dates });
    const data = await getMessagesTimeseries(dates);
    res.status(httpStatus.OK).json(ok(data));
  } catch (err) {
    next(err);
  }
};

export const chatsController = async (req, res, next) => {
  try {
    const dates = requireDates(req);
    await logDashboardAccess({ userId: req.user.id, endpoint: req.path, ...dates });
    const data = await getChatsByQueue(dates);
    res.status(httpStatus.OK).json(ok(data));
  } catch (err) {
    next(err);
  }
};

export const drilldownController = async (req, res, next) => {
  try {
    const dates = requireDates(req);
    const level = req.query?.level || 'agent';
    await logDashboardAccess({ userId: req.user.id, endpoint: `${req.path}:${level}`, ...dates });
    const data = await getDrilldown({ ...dates, level });
    res.status(httpStatus.OK).json(ok(data));
  } catch (err) {
    next(err);
  }
};

export default {
  overviewController,
  messagesController,
  chatsController,
  drilldownController
};
