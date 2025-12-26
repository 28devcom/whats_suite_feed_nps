// Enforce API response contract { success, data, message, code } for all JSON responses.
export const responseWrapper = (_req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    res.setHeader('X-API-Version', 'v1');
    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
      return originalJson(payload);
    }
    const message = res.statusCode >= 400 ? 'ERROR' : 'OK';
    const code = res.statusCode >= 400 ? 'ERROR' : 'OK';
    return originalJson({
      success: res.statusCode < 400,
      data: payload ?? null,
      message,
      code
    });
  };
  next();
};
