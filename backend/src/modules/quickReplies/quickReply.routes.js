import { Router } from 'express';
import { authorize } from '../../interfaces/http/middlewares/authMiddleware.js';
import validateRequest from '../../interfaces/http/middlewares/validateRequest.js';
import { ROLES } from '../../domain/user/user.js';
import {
  createQuickReplyController,
  deleteQuickReplyController,
  listQuickRepliesController,
  sendQuickReplyController,
  updateQuickReplyController
} from './quickReply.controller.js';
import {
  quickReplyCreateValidator,
  quickReplyListValidator,
  quickReplySendValidator,
  quickReplyUpdateValidator,
  quickReplyIdParamValidator
} from '../../interfaces/http/validators/quickReplyValidators.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), quickReplyListValidator, validateRequest, listQuickRepliesController);
router.post('/', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), quickReplyCreateValidator, validateRequest, createQuickReplyController);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), quickReplyUpdateValidator, validateRequest, updateQuickReplyController);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), quickReplyIdParamValidator, validateRequest, deleteQuickReplyController);
router.post('/:id/send', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), quickReplySendValidator, validateRequest, sendQuickReplyController);

export default router;
