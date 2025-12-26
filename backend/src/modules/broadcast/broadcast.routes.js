import { Router } from 'express';
import validateRequest from '../../interfaces/http/middlewares/validateRequest.js';
import {
  sendBroadcastController,
  broadcastHistoryController,
  listBroadcastTemplatesController,
  createBroadcastTemplateController,
  deleteBroadcastTemplateController,
  broadcastDetailController
} from './broadcast.controller.js';
import {
  broadcastSendValidator,
  broadcastTemplateIdValidator,
  broadcastTemplateValidator,
  broadcastCampaignIdValidator
} from '../../interfaces/http/validators/broadcastValidators.js';

const router = Router();

router.post('/send', broadcastSendValidator, validateRequest, sendBroadcastController);
router.get('/history', broadcastHistoryController);
router.get('/history/:id', broadcastCampaignIdValidator, validateRequest, broadcastDetailController);
router.get('/templates', listBroadcastTemplatesController);
router.post('/templates', broadcastTemplateValidator, validateRequest, createBroadcastTemplateController);
router.delete('/templates/:id', broadcastTemplateIdValidator, validateRequest, deleteBroadcastTemplateController);

export default router;
