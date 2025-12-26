import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  createTemplateController,
  listTemplatesController,
  createCampaignController,
  listCampaignsController,
  getCampaignController,
  getTargetsController,
  getEventsController,
  scheduleCampaignController,
  runCampaignController
} from '../controllers/massMessagingController.js';
import {
  templateValidator,
  campaignCreateValidator,
  campaignIdValidator,
  targetStatusQuery
} from '../validators/massMessagingValidators.js';
import { ROLES } from '../../../domain/user/user.js';

const router = Router();
router.use(authenticate);

router.post('/templates', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), templateValidator, validateRequest, createTemplateController);
router.get('/templates', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), listTemplatesController);

router.post('/campaigns', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), campaignCreateValidator, validateRequest, createCampaignController);
router.get('/campaigns', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), listCampaignsController);
router.get('/campaigns/:campaignId', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), campaignIdValidator, validateRequest, getCampaignController);
router.get('/campaigns/:campaignId/targets', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), campaignIdValidator.concat(targetStatusQuery), validateRequest, getTargetsController);
router.get('/campaigns/:campaignId/events', authorize(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE), campaignIdValidator, validateRequest, getEventsController);
router.post('/campaigns/:campaignId/schedule', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), campaignIdValidator, validateRequest, scheduleCampaignController);
router.post('/campaigns/:campaignId/run', authorize(ROLES.ADMIN, ROLES.SUPERVISOR), campaignIdValidator, validateRequest, runCampaignController);

export default router;
