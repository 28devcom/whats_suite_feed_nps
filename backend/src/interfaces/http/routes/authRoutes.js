import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  loginController,
  logoutController,
  meController,
  forceLogoutController,
  createUserController
} from '../controllers/authController.js';
import { loginValidator, forceLogoutValidator, createUserValidator } from '../validators/authValidators.js';
import { ROLES } from '../../../domain/user/user.js';

const router = Router();

// login no requiere token, resto protegido
router.post('/login', loginValidator, validateRequest, loginController);
router.post('/logout', authenticate, logoutController);
router.get('/me', authenticate, meController);
router.post('/force-logout/:userId', authenticate, authorize(ROLES.ADMIN), forceLogoutValidator, validateRequest, forceLogoutController);
router.post('/users', authenticate, authorize(ROLES.ADMIN), createUserValidator, validateRequest, createUserController);

export default router;
