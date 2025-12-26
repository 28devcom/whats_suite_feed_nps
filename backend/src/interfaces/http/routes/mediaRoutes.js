import { Router } from 'express';
import { streamMediaController } from '../controllers/mediaController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../../../domain/user/user.js';

const router = Router();

router.use(authenticate);

// GET y POST protegidos; se valida ruta/hash en el controlador.
router.get('/', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), streamMediaController);
router.post('/stream', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), streamMediaController);

export default router;
