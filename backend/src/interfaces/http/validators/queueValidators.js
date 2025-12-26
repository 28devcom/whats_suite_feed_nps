import { body, param } from 'express-validator';

export const queueIdParam = [param('id').isUUID().withMessage('id inválido')];

export const createQueueValidator = [
  body('name').isLength({ min: 2 }).withMessage('Nombre requerido'),
  body('description').optional().isString()
];

export const updateQueueValidator = [
  ...queueIdParam,
  body('name').optional().isLength({ min: 2 }).withMessage('Nombre inválido'),
  body('description').optional().isString(),
  body('active').optional().isBoolean().withMessage('Activo inválido')
];
