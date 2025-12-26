import { v4 as uuidv4 } from 'uuid';

// Guarantees correlation IDs for tracing across services and audit trails.
const requestContext = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

export default requestContext;
