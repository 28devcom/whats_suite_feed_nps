import { body, param } from 'express-validator';

export const manualAssignValidator = [
  param('conversationId').isUUID().withMessage('conversationId debe ser UUID'),
  body('agentId').isUUID().withMessage('agentId requerido'),
  body('reason').optional().isString()
];

export const autoAssignValidator = [
  param('conversationId').isUUID().withMessage('conversationId debe ser UUID'),
  body('agentIds').isArray({ min: 1 }).withMessage('agentIds requerido'),
  body('agentIds.*').isUUID().withMessage('agentIds deben ser UUID')
];

export const statusChangeValidator = [
  param('conversationId').isUUID().withMessage('conversationId debe ser UUID'),
  body('status').isIn(['open', 'assigned', 'closed']).withMessage('status inválido')
];
