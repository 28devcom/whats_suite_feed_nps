import { Router } from 'express';
import { authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../../../domain/user/user.js';
import {
  start,
  pause,
  resume,
  status,
  simulate,
  runCycle,
  lines,
  selection,
  setSelection
} from '../controllers/warmupController.js';

const router = Router();

router.get('/status', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), status);
router.post('/start', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), start);
router.post('/pause', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), pause);
router.post('/resume', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), resume);
router.post('/simulate', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), simulate);
router.post('/run', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), runCycle);
router.get('/run', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), runCycle); // atajo GET para facilitar pruebas
router.get('/lines', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), lines);
router.get('/selection', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), selection);
router.post('/selection', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), setSelection);

export default router;
