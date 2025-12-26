import { body, param } from 'express-validator';

export const broadcastSendValidator = [
  body('name').isString().isLength({ min: 3 }).withMessage('Nombre requerido'),
  body('messageType').optional().isIn(['text', 'image', 'file', 'tts']).withMessage('Tipo inválido'),
  body('recipients')
    .custom((value, { req }) => {
      const hasXlsx = req.body?.xlsx && typeof req.body.xlsx === 'object';
      if (hasXlsx) return true;
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error('Se requieren destinatarios');
      }
      return true;
    }),
  body('recipients.*').optional().isString().withMessage('Destinatario inválido'),
  body('xlsx').optional().isObject(),
  body('xlsx.dataUrl').optional().isString(),
  body('xlsx.name').optional().isString(),
  body('xlsx.type').optional().isString(),
  body('connections').isArray({ min: 1 }).withMessage('Se requiere al menos una conexión'),
  body('connections.*').isString().withMessage('Conexión inválida'),
  body('delayMin').optional().isInt({ min: 0 }).withMessage('delayMin inválido'),
  body('delayMax').optional().isInt({ min: 0 }).withMessage('delayMax inválido'),
  body('templateId').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('templateId inválido'),
  body('startAt').optional().isISO8601().withMessage('startAt inválido'),
  body('stopAt').optional().isISO8601().withMessage('stopAt inválido'),
  body('text').optional().isString(),
  body('file').optional().isObject(),
  body('file.dataUrl').optional().isString(),
  body('file.name').optional().isString(),
  body('file.type').optional().isString(),
  body('tts').optional().isObject(),
  body('tts.voice').optional().isString(),
  body('tts.speed').optional().isFloat({ min: 0.5, max: 2.5 })
];

export const broadcastTemplateValidator = [
  body('name').isString().isLength({ min: 3 }).withMessage('Nombre requerido'),
  body('type').isIn(['text', 'image', 'file', 'tts']).withMessage('Tipo inválido'),
  body('body').optional().isString(),
  body('text').optional().isString(),
  body('media').optional().isObject(),
  body('media.dataUrl').optional().isString(),
  body('media.name').optional().isString(),
  body('media.type').optional().isString()
];

export const broadcastTemplateIdValidator = [param('id').isUUID().withMessage('ID inválido')];
export const broadcastCampaignIdValidator = [param('id').isUUID().withMessage('ID de campaña inválido')];
