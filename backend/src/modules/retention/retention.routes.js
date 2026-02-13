import { Router } from 'express';
import * as retentionController from './retention.controller.js';
import { authMiddleware } from '../../interfaces/http/middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/stats', retentionController.getStats);
router.get('/at-risk', retentionController.getAtRisk);

export default router;
