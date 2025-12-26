import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import {
  listQueuesController,
  getQueueController,
  createQueueController,
  updateQueueController,
  deleteQueueController
} from '../controllers/queueController.js';
import { createQueueValidator, updateQueueValidator, queueIdParam } from '../validators/queueValidators.js';
import validateRequest from '../middlewares/validateRequest.js';
import { ROLES } from '../../../domain/user/user.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), listQueuesController);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), queueIdParam, validateRequest, getQueueController);
router.post('/', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), createQueueValidator, validateRequest, createQueueController);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), updateQueueValidator, validateRequest, updateQueueController);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), queueIdParam, validateRequest, deleteQueueController);

export default router;
