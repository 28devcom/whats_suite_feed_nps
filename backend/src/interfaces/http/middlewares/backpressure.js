import env from '../../../config/env.js';
import { AppError } from '../../../shared/errors.js';

const maxConcurrent = env.http.maxConcurrentRequests;
const queueLimit = env.http.backpressureQueueLimit;

let active = 0;
const waiting = [];

const acquire = () =>
  new Promise((resolve, reject) => {
    if (active < maxConcurrent) {
      active += 1;
      return resolve();
    }
    if (waiting.length >= queueLimit) {
      return reject(new AppError('Server overloaded, try again shortly', 503));
    }
    waiting.push(resolve);
  });

const release = () => {
  if (active > 0) active -= 1;
  const next = waiting.shift();
  if (next) {
    active += 1;
    next();
  }
};

const backpressure = async (_req, res, next) => {
  try {
    await acquire();
  } catch (err) {
    return next(err);
  }

  let released = false;
  const finish = () => {
    if (released) return;
    released = true;
    release();
  };
  res.on('finish', finish);
  res.on('close', finish);

  return next();
};

export default backpressure;
