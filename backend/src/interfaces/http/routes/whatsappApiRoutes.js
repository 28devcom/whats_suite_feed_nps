import { Router } from 'express';
import {
  createSessionController,
  listSessionsController,
  getQrController,
  requestPairingCodeController,
  getStatusController,
  reconnectController,
  renewQrController,
  resetAuthController,
  disconnectController,
  deleteSessionController,
  updateSessionSettingsController
} from '../controllers/whatsappApiController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../../../domain/user/user.js';

const router = Router();

router.use(authenticate);

router.get('/sessions', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), listSessionsController);
router.post('/sessions', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), createSessionController);
router.get('/sessions/:id/qr', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), getQrController);
router.post('/sessions/:id/pairing-code', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), requestPairingCodeController);
router.get('/sessions/:id/status', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), getStatusController);
router.patch('/sessions/:id/settings', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), updateSessionSettingsController);
router.post('/sessions/:id/reconnect', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), reconnectController);
router.post('/sessions/:id/renew-qr', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), renewQrController);
router.post('/sessions/:id/reset-auth', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), resetAuthController);
router.post('/sessions/:id/disconnect', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), disconnectController);
router.delete('/sessions/:id', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), deleteSessionController);

export default router;
