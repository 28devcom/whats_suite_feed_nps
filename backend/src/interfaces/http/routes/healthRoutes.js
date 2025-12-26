import { Router } from 'express';
import healthService from '../../../services/healthService.js';

const router = Router();

router.get('/live', (req, res) => {
  res.json(healthService.getLiveness());
});

router.get('/ready', async (req, res, next) => {
  try {
    const status = await healthService.getReadiness();
    const httpCode = status.healthy ? 200 : 503;
    res.status(httpCode).json(status);
  } catch (err) {
    next(err);
  }
});

export default router;
