import { body } from 'express-validator';

export const chatCreateValidator = [
  body('sessionName').isString().trim().isLength({ min: 2, max: 128 }).withMessage('connection_id requerido'),
  body('contact').isString().trim().isLength({ min: 6, max: 32 }).withMessage('contacto requerido'),
  body('queueId').optional().isUUID().withMessage('queueId inválido')
];
