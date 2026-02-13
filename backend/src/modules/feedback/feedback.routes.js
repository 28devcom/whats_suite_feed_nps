import { Router } from 'express';
import * as feedbackController from './feedback.controller.js';
import { authMiddleware } from '../../interfaces/http/middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

// Templates
router.post('/templates', feedbackController.createTemplate);
router.get('/templates', feedbackController.listTemplates);
router.delete('/templates/:id', feedbackController.deleteTemplate);

// Settings
router.get('/settings', feedbackController.getSettings);
router.put('/settings', feedbackController.updateSettings);

// Responses & Stats
router.get('/stats', feedbackController.getStats);
router.get('/responses', feedbackController.listResponses);

// Webhook (Internal/Public depending on how WA integration works)
router.post('/webhook', feedbackController.receiveWebhookResponse);

export default router;
