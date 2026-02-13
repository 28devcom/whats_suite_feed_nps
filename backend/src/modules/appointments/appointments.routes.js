import { Router } from 'express';
import * as appointmentsController from './appointments.controller.js';
import { authMiddleware } from '../../interfaces/http/middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/', appointmentsController.create);
router.get('/', appointmentsController.list);
router.patch('/:id/status', appointmentsController.updateStatus);
router.delete('/:id', appointmentsController.remove);

export default router;
