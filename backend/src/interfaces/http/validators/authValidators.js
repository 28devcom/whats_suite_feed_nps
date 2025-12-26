import { body, param } from 'express-validator';
import { ROLES } from '../../../domain/user/user.js';

export const loginValidator = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Password mínimo 8 caracteres')
];

export const forceLogoutValidator = [
  param('userId').isUUID().withMessage('userId debe ser UUID')
];

export const createUserValidator = [
  body('email').isEmail().withMessage('Email inválido'),
  body('fullName').isLength({ min: 3 }).withMessage('Nombre requerido'),
  body('password').isLength({ min: 8 }).withMessage('Password mínimo 8 caracteres'),
  body('role').isIn(Object.values(ROLES)).withMessage('Rol inválido')
];
