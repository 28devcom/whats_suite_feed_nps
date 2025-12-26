import { Router } from 'express';
import {
  listUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController
} from '../controllers/userController.js';
import { authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../../../domain/user/user.js';
import { createUserValidator, updateUserValidator, userIdParam } from '../validators/userValidators.js';
import validateRequest from '../middlewares/validateRequest.js';

const router = Router();

// Listing and detail: ADMIN, SUPERVISOR
router.get('/', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), listUsersController);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), userIdParam, validateRequest, getUserController);

// Create/Update/Delete: ADMIN only
router.post('/', authorize(ROLES.ADMIN), createUserValidator, validateRequest, createUserController);
router.put('/:id', authorize(ROLES.ADMIN), updateUserValidator, validateRequest, updateUserController);
router.delete('/:id', authorize(ROLES.ADMIN), userIdParam, validateRequest, deleteUserController);

export default router;
