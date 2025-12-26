import { messagesPerMinute, mediaFilesPerDay, activeAgents, responseSla } from '../../../infra/db/metricsRepository.js';
import { AppError } from '../../../shared/errors.js';

export const getMetrics = async (req, res, next) => {
  try {
    const minutes = req.query.minutes ? Number(req.query.minutes) : 60;
    const days = req.query.days ? Number(req.query.days) : 30;
    if (Number.isNaN(minutes) || Number.isNaN(days)) {
      throw new AppError('Parámetros inválidos', 400);
    }

    const [mpm, mfd, agents, sla] = await Promise.all([
      messagesPerMinute(minutes),
      mediaFilesPerDay(days),
      activeAgents(),
      responseSla()
    ]);

    res.json({
      messagesPerMinute: mpm,
      mediaFilesPerDay: mfd,
      activeAgents: agents,
      responseSlaSeconds: sla
    });
  } catch (err) {
    next(err);
  }
};
