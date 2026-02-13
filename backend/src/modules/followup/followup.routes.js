import { Router } from 'express';
import * as followupController from './followup.controller.js';
import { authMiddleware } from '../../interfaces/http/middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/rules', followupController.createRule);
router.get('/rules', followupController.listRules);
router.delete('/rules/:id', followupController.deleteRule);
router.get('/logs', followupController.getLogs);

export default router;
