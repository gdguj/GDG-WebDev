function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 400;
  const message = err.message || "Something went wrong";
  const isDevelopment = process.env.NODE_ENV !== "production";

  return res.status(statusCode).json({
    success: false,
    message,
    ...(isDevelopment && { error: err.stack }),
  });
}

module.exports = errorMiddleware;