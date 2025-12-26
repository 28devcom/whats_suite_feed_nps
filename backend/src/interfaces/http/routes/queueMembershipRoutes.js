import { Router } from 'express';
import { authorize, authenticate } from '../middlewares/authMiddleware.js';
import {
  listQueueUsersController,
  addQueueUserController,
  removeQueueUserController,
  listQueueConnectionsController,
  addQueueConnectionController,
  removeQueueConnectionController
} from '../controllers/queueMembershipController.js';
import { ROLES } from '../../../domain/user/user.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Users
router.get('/:id/users', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), listQueueUsersController);
router.post('/:id/users', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), addQueueUserController);
router.delete('/:id/users/:userId', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), removeQueueUserController);

// WhatsApp connections
router.get('/:id/whatsapp', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), listQueueConnectionsController);
router.post('/:id/whatsapp', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), addQueueConnectionController);
router.delete('/:id/whatsapp/:sessionName', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), removeQueueConnectionController);

export default router;
