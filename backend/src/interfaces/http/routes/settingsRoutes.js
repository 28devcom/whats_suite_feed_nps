import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../../../domain/user/user.js';
import { getChatSettingsController, updateChatSettingsController } from '../controllers/systemSettingsController.js';

const router = Router();

router.use(authenticate);

router.get('/chat', authorize(ROLES.ADMIN), getChatSettingsController);
router.put('/chat', authorize(ROLES.ADMIN), updateChatSettingsController);

export default router;
