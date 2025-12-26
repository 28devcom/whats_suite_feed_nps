import { Router } from 'express';
import {
  createSessionController,
  listSessionsController,
  getQrController,
  requestPairingCodeController,
  getStatusController,
  reconnectController,
  disconnectController,
  deleteSessionController,
  updateSessionSettingsController
} from '../controllers/whatsappApiController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'SUPERVISOR'));

router.get('/sessions', listSessionsController);
router.post('/sessions', createSessionController);
router.get('/sessions/:id/qr', getQrController);
router.post('/sessions/:id/pairing-code', requestPairingCodeController);
router.get('/sessions/:id/status', getStatusController);
router.patch('/sessions/:id/settings', updateSessionSettingsController);
router.post('/sessions/:id/reconnect', reconnectController);
router.post('/sessions/:id/disconnect', disconnectController);
router.delete('/sessions/:id', deleteSessionController);

export default router;
