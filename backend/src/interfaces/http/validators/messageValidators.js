import { body, param, query } from 'express-validator';

export const createConversationValidator = [body('name').isLength({ min: 3 }).withMessage('Nombre requerido')];

export const messageCreateValidator = [
  body('conversationId').isUUID().withMessage('conversationId debe ser UUID'),
  body('direction').isIn(['inbound', 'outbound']).withMessage('direction inválido'),
  body('messageType').isIn(['text', 'media', 'location', 'contact', 'system']).withMessage('messageType inválido'),
  body('payloadType').notEmpty().withMessage('payloadType requerido'),
  body('payload').optional().isObject().withMessage('payload debe ser objeto'),
  body('attachments').optional().isArray().withMessage('attachments debe ser array')
];

export const messagePaginateValidator = [
  query('conversationId').isUUID().withMessage('conversationId requerido'),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('cursor').optional().isISO8601().withMessage('cursor debe ser fecha ISO')
];

export const messageIdParamValidator = [param('messageId').isUUID().withMessage('messageId debe ser UUID')];
