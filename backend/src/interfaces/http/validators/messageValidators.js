import { body, param } from 'express-validator';

const isUuid = (value) => /^[0-9a-fA-F-]{36}$/.test(value || '');

export const messageIdParam = [
  param('messageId')
    .custom((value) => {
      if (isUuid(value)) return true;
      return typeof value === 'string' && value.trim().length >= 4;
    })
    .withMessage('messageId inválido')
];

export const sendMessageValidator = [
  body('chatId').isUUID().withMessage('chatId inválido'),
  body('content').not().isEmpty().withMessage('Contenido requerido')
];
