// Añade encabezado de versión para todas las respuestas API v1.
export const apiVersionHeader = (req, res, next) => {
  res.setHeader('X-API-Version', 'v1');
  next();
};
