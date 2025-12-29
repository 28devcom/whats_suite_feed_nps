import { Router } from 'express';
import { authorize, authenticate } from '../middlewares/authMiddleware.js';
import { ROLES } from '../../../domain/user/user.js';
import { deleteMessageController } from '../controllers/messageController.js';
import { messageIdParam } from '../validators/messageValidators.js';
import validateRequest from '../middlewares/validateRequest.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Solo borrar mensajes del chat (agentes/admin/supervisor con visibilidad)
router.post('/:messageId/delete', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), messageIdParam, validateRequest, deleteMessageController);

export default router;
