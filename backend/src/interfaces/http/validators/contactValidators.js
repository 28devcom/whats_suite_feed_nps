import { body, param } from 'express-validator';

const phoneRule = (field) =>
  field
    .isString()
    .trim()
    .isLength({ min: 6, max: 32 })
    .withMessage('Teléfono inválido');

export const contactByPhoneValidator = [phoneRule(param('phone'))];

export const contactUpsertValidator = [
  phoneRule(body('phone')),
  body('displayName').isString().withMessage('displayName requerido').isLength({ max: 120 }),
  body('avatarRef').optional({ nullable: true }).isString().trim().isLength({ max: 512 }),
  body('metadata')
    .optional({ nullable: true })
    .isObject()
    .withMessage('metadata debe ser objeto')
    .custom((val) => !Array.isArray(val))
    .withMessage('metadata debe ser objeto plano')
];
