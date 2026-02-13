import { Router } from 'express';
import * as analyticsController from './analytics.controller.js';
import { authMiddleware } from '../../interfaces/http/middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/kpis', analyticsController.getKpis);
router.get('/evolution', analyticsController.getEvolution);

export default router;
