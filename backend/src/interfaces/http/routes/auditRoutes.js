import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { listAuditLogsController, exportAuditLogsController } from '../controllers/auditController.js';
import { recordFrontendAuditController } from '../controllers/frontendAuditController.js';
import { ROLES } from '../../../domain/user/user.js';

const router = Router();
router.use(authenticate);
router.get('/logs', authorize(ROLES.ADMIN), listAuditLogsController);
router.get('/logs/export', authorize(ROLES.ADMIN), exportAuditLogsController);
router.post('/frontend', recordFrontendAuditController);

export default router;
