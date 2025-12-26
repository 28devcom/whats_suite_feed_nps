// Lightweight 404 handler keeps routing failures observable.
const notFoundHandler = (req, res) => {
  res.setHeader('X-API-Version', 'v1');
  res.status(404).json({
    success: false,
    data: null,
    message: 'Not Found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    requestId: res.locals.requestId,
    version: 'v1'
  });
};

export default notFoundHandler;
