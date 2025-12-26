import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  createConversationController,
  listConversationsController,
  ingestMessageController,
  listMessagesController,
  getMessageController,
  markDeliveredController,
  markFailedController
} from '../controllers/messageController.js';
import {
  createConversationValidator,
  messageCreateValidator,
  messagePaginateValidator,
  messageIdParamValidator
} from '../validators/messageValidators.js';
import { ROLES } from '../../../domain/user/user.js';

const router = Router();
router.use(authenticate);

// Conversaciones
router.get('/conversations', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), listConversationsController);
router.post('/conversations', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), createConversationValidator, validateRequest, createConversationController);

// Mensajes
router.post('/messages', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), messageCreateValidator, validateRequest, ingestMessageController);
router.get('/messages', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), messagePaginateValidator, validateRequest, listMessagesController);
router.get('/messages/:messageId', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), messageIdParamValidator, validateRequest, getMessageController);
router.post('/messages/:messageId/delivered', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), messageIdParamValidator, validateRequest, markDeliveredController);
router.post('/messages/:messageId/failed', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), messageIdParamValidator, validateRequest, markFailedController);

export default router;
