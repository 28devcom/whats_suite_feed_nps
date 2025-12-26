import { body, param, query } from 'express-validator';

export const templateValidator = [
  body('name').isLength({ min: 3 }).withMessage('Nombre requerido'),
  body('body').isLength({ min: 1 }).withMessage('Body requerido'),
  body('variables').optional().isArray()
];

export const campaignCreateValidator = [
  body('name').isLength({ min: 3 }).withMessage('Nombre requerido'),
  body('templateId').isUUID().withMessage('templateId requerido'),
  body('whatsappSessionId').optional().isUUID(),
  body('scheduledAt').optional().isISO8601(),
  body('targets').optional().isArray(),
  body('targets.*.contact').isString().withMessage('contact requerido'),
  body('targets.*.variables').optional().isObject()
];

export const campaignIdValidator = [param('campaignId').isUUID().withMessage('campaignId inválido')];

export const targetStatusQuery = [query('status').optional().isIn(['pending', 'sent', 'failed'])];
