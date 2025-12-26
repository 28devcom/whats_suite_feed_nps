import { validationResult } from 'express-validator';
import { AppError } from '../../../shared/errors.js';

const validateRequest = (req, _res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const mapped = errors.array().map((e) => ({ field: e.param, message: e.msg }));
  next(new AppError('Datos inválidos', 422, mapped));
};

export default validateRequest;
