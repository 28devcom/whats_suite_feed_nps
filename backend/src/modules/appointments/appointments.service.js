import pool from '../../infra/db/postgres.js';
import { AppError } from '../../shared/errors.js';

export const createAppointment = async (tenantId, userId, data) => {
    const { customer_phone, customer_name, start_at, end_at, description, location } = data;
    const result = await pool.query(
        `INSERT INTO appointments (tenant_id, created_by, customer_phone, customer_name, start_at, end_at, description, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [tenantId, userId, customer_phone, customer_name, start_at, end_at, description, location]
    );
    const appointment = result.rows[0];

    // Automatically schedule reminders (simplified logic)
    const start = new Date(start_at);
    
    // 24h Before
    const reminder24h = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    if (reminder24h > new Date()) {
        await pool.query(
            'INSERT INTO appointment_reminders (appointment_id, tenant_id, reminder_type, scheduled_at) VALUES ($1, $2, $3, $4)',
            [appointment.id, tenantId, '24H_BEFORE', reminder24h]
        );
    }

    // 1h Before
    const reminder1h = new Date(start.getTime() - 60 * 60 * 1000);
    if (reminder1h > new Date()) {
        await pool.query(
            'INSERT INTO appointment_reminders (appointment_id, tenant_id, reminder_type, scheduled_at) VALUES ($1, $2, $3, $4)',
            [appointment.id, tenantId, '1H_BEFORE', reminder1h]
        );
    }

    return appointment;
};

export const listAppointments = async (tenantId, startDate, endDate) => {
    const result = await pool.query(
        'SELECT * FROM appointments WHERE tenant_id = $1 AND start_at BETWEEN $2 AND $3 ORDER BY start_at ASC',
        [tenantId, startDate || '1970-01-01', endDate || '9999-12-31']
    );
    return result.rows;
};

export const updateAppointmentStatus = async (tenantId, id, status) => {
    const result = await pool.query(
        'UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3 RETURNING *',
        [status, id, tenantId]
    );
    if (result.rowCount === 0) throw new AppError('Appointment not found', 404);
    return result.rows[0];
};

export const deleteAppointment = async (tenantId, id) => {
    const result = await pool.query('DELETE FROM appointments WHERE id = $1 AND tenant_id = $2 RETURNING *', [id, tenantId]);
    if (result.rowCount === 0) throw new AppError('Appointment not found', 404);
    return result.rows[0];
};
