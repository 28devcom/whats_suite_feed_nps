import { Router } from 'express';
import { authorize } from '../middlewares/authMiddleware.js';
import validateRequest from '../middlewares/validateRequest.js';
import { ROLES } from '../../../domain/user/user.js';
import { contactByPhoneValidator, contactUpsertValidator } from '../validators/contactValidators.js';
import { getContactByPhoneController, upsertContactController } from '../controllers/contactController.js';

const router = Router();

router.get(
  '/by-phone/:phone',
  authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE),
  contactByPhoneValidator,
  validateRequest,
  getContactByPhoneController
);

router.post(
  '/upsert',
  authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE),
  contactUpsertValidator,
  validateRequest,
  upsertContactController
);

export default router;
