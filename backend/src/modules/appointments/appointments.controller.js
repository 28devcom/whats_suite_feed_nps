import * as appointmentsService from './appointments.service.js';
import { asyncHandler } from '../../interfaces/http/middlewares/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
    const appointment = await appointmentsService.createAppointment(req.user.tenantId, req.user.id, req.body);
    res.status(201).json(appointment);
});

export const list = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const appointments = await appointmentsService.listAppointments(req.user.tenantId, startDate, endDate);
    res.json(appointments);
});

export const updateStatus = asyncHandler(async (req, res) => {
    const appointment = await appointmentsService.updateAppointmentStatus(req.user.tenantId, req.params.id, req.body.status);
    res.json(appointment);
});

export const remove = asyncHandler(async (req, res) => {
    await appointmentsService.deleteAppointment(req.user.tenantId, req.params.id);
    res.status(204).end();
});
