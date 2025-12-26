import { AppError } from '../../shared/errors.js';

export const createWorkerQueue = ({ concurrency = 5, maxQueue = 500, name = 'default', logger }) => {
  let active = 0;
  const queue = [];

  const runNext = () => {
    if (active >= concurrency) return;
    const job = queue.shift();
    if (!job) return;
    active += 1;
    job()
      .catch((err) => {
        if (logger) logger.error({ err, queue: name }, 'Worker queue job failed');
      })
      .finally(() => {
        active -= 1;
        runNext();
      });
  };

  const enqueue = (fn) =>
    new Promise((resolve, reject) => {
      if (queue.length >= maxQueue && active >= concurrency) {
        return reject(new AppError(`Queue ${name} overloaded`, 503));
      }
      queue.push(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (err) {
          reject(err);
          throw err;
        }
      });
      queueMicrotask(runNext);
    });

  const stats = () => ({ active, queued: queue.length, capacity: maxQueue, concurrency });

  return { enqueue, stats };
};

export default createWorkerQueue;
