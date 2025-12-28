import { body, param } from 'express-validator';
import { USER_ROLES, USER_STATUS } from '../../../domain/user/user.entity.js';

const roleValues = Object.values(USER_ROLES);
const statusValues = Object.values(USER_STATUS);

export const userIdParam = [param('id').isUUID().withMessage('id inválido')];

export const createUserValidator = [
  body('name').isLength({ min: 2 }).withMessage('Nombre requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('username').optional({ nullable: true, checkFalsy: true }).isLength({ min: 3 }).withMessage('Username inválido'),
  body('password').isLength({ min: 6 }).withMessage('Password mínimo 6 caracteres'),
  body('role').optional().isIn(roleValues).withMessage('Rol inválido'),
  body('status').optional().isIn(statusValues).withMessage('Estado inválido')
];

export const updateUserValidator = [
  ...userIdParam,
  body('name').optional().isLength({ min: 2 }).withMessage('Nombre inválido'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('username').optional({ nullable: true, checkFalsy: true }).isLength({ min: 3 }).withMessage('Username inválido'),
  body('password').optional({ nullable: true, checkFalsy: true }).isLength({ min: 6 }).withMessage('Password mínimo 6 caracteres'),
  body('role').optional().isIn(roleValues).withMessage('Rol inválido'),
  body('status').optional().isIn(statusValues).withMessage('Estado inválido')
];
