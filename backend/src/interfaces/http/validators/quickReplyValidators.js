import { body, param, query } from 'express-validator';

const variableNameRule = body('variables.*')
  .optional()
  .isString()
  .trim()
  .matches(/^[a-zA-Z0-9_.-]{1,64}$/)
  .withMessage('Nombre de variable inválido');

export const quickReplyListValidator = [
  query('search').optional().isString(),
  query('cursor').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('active').optional().isBoolean()
];

export const quickReplyCreateValidator = [
  body('titulo').isLength({ min: 3, max: 160 }).withMessage('Título requerido'),
  body('textoBase').isLength({ min: 3, max: 4000 }).withMessage('Texto base requerido'),
  body('variables').optional().isArray({ max: 25 }).withMessage('variables debe ser arreglo'),
  variableNameRule,
  body('activo').optional().isBoolean()
];

export const quickReplyUpdateValidator = [
  param('id').isUUID().withMessage('id inválido'),
  body('titulo').optional().isLength({ min: 3, max: 160 }),
  body('textoBase').optional().isLength({ min: 3, max: 4000 }),
  body('variables').optional().isArray({ max: 25 }),
  variableNameRule,
  body('activo').optional().isBoolean()
];

export const quickReplyIdParamValidator = [param('id').isUUID().withMessage('id inválido')];

export const quickReplySendValidator = [
  param('id').isUUID().withMessage('id inválido'),
  body('chatId').isUUID().withMessage('chatId es requerido'),
  body('variables').optional().isObject()
];
