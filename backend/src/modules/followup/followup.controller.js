import * as followupService from './followup.service.js';
import { asyncHandler } from '../../interfaces/http/middlewares/asyncHandler.js';

export const createRule = asyncHandler(async (req, res) => {
    const rule = await followupService.createRule(req.user.tenantId, req.body);
    res.status(201).json(rule);
});

export const listRules = asyncHandler(async (req, res) => {
    const rules = await followupService.listRules(req.user.tenantId);
    res.json(rules);
});

export const deleteRule = asyncHandler(async (req, res) => {
    await followupService.deleteRule(req.user.tenantId, req.params.id);
    res.status(204).end();
});

export const getLogs = asyncHandler(async (req, res) => {
    const logs = await followupService.getFollowupLogs(req.user.tenantId);
    res.json(logs);
});
