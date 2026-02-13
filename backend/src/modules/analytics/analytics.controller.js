import * as analyticsService from './analytics.service.js';
import { asyncHandler } from '../../interfaces/http/middlewares/asyncHandler.js';

export const getKpis = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const kpis = await analyticsService.getPostSalesKpis(req.user.tenantId, startDate, endDate);
    res.json(kpis);
});

export const getEvolution = asyncHandler(async (req, res) => {
    const { months } = req.query;
    const evolution = await analyticsService.getEvolutionData(req.user.tenantId, months);
    res.json(evolution);
});
