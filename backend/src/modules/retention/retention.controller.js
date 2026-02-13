import * as retentionService from './retention.service.js';
import { asyncHandler } from '../../interfaces/http/middlewares/asyncHandler.js';

export const getStats = asyncHandler(async (req, res) => {
    const stats = await retentionService.getRetentionStats(req.user.tenantId);
    res.json(stats);
});

export const getAtRisk = asyncHandler(async (req, res) => {
    const customers = await retentionService.getAtRiskCustomers(req.user.tenantId);
    res.json(customers);
});
