import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  manualAssignController,
  autoAssignController,
  changeStatusController,
  assignmentHistoryController,
  statusHistoryController
} from '../controllers/assignmentController.js';
import { manualAssignValidator, autoAssignValidator, statusChangeValidator } from '../validators/assignmentValidators.js';
import { ROLES } from '../../../domain/user/user.js';

const router = Router();
router.use(authenticate);

router.post('/conversations/:conversationId/assign', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), manualAssignValidator, validateRequest, manualAssignController);
router.post('/conversations/:conversationId/auto-assign', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), autoAssignValidator, validateRequest, autoAssignController);
router.post('/conversations/:conversationId/status', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), statusChangeValidator, validateRequest, changeStatusController);
router.get('/conversations/:conversationId/assignments', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), manualAssignValidator.slice(0,1), validateRequest, assignmentHistoryController);
router.get('/conversations/:conversationId/status-events', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), manualAssignValidator.slice(0,1), validateRequest, statusHistoryController);

export default router;
