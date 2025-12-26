import { Router } from 'express';
import { authorizeDashboard } from '../../interfaces/http/middlewares/authMiddleware.js';
import { overviewController, messagesController, chatsController, drilldownController } from './dashboard.controller.js';

const router = Router();

router.get('/overview', authorizeDashboard, overviewController);
router.get('/messages', authorizeDashboard, messagesController);
router.get('/chats', authorizeDashboard, chatsController);
router.get('/drilldown', authorizeDashboard, drilldownController);

export default router;
