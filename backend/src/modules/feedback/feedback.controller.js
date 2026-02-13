import * as feedbackService from './feedback.service.js';
import { asyncHandler } from '../../interfaces/http/middlewares/asyncHandler.js';

export const createTemplate = asyncHandler(async (req, res) => {
    const template = await feedbackService.createTemplate(req.user.tenantId, req.body);
    res.status(201).json(template);
});

export const listTemplates = asyncHandler(async (req, res) => {
    const templates = await feedbackService.listTemplates(req.user.tenantId);
    res.json(templates);
});

export const deleteTemplate = asyncHandler(async (req, res) => {
    await feedbackService.deleteTemplate(req.user.tenantId, req.params.id);
    res.status(204).end();
});

export const getSettings = asyncHandler(async (req, res) => {
    const settings = await feedbackService.getSettings(req.user.tenantId);
    res.json(settings);
});

export const updateSettings = asyncHandler(async (req, res) => {
    const settings = await feedbackService.updateSettings(req.user.tenantId, req.body);
    res.json(settings);
});

export const getStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const stats = await feedbackService.getStats(req.user.tenantId, startDate, endDate);
    res.json(stats);
});

export const listResponses = asyncHandler(async (req, res) => {
    const responses = await feedbackService.listResponses(req.user.tenantId, req.query);
    res.json(responses);
});

export const receiveWebhookResponse = asyncHandler(async (req, res) => {
    // This would be called by the WhatsApp inbound service when a response to a feedback is detected
    const response = await feedbackService.registerResponse(req.body.tenantId, req.body);
    res.json(response);
});
