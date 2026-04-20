const authService = require("../services/auth.service");

function requireAuth(req, res, next) {
  try {
    const authorization = String(req.headers.authorization || "");
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      const error = new Error("يجب تسجيل الدخول للوصول لهذه الصفحة.");
      error.statusCode = 401;
      throw error;
    }

    const payload = authService.verifyToken(token);
    req.authUser = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
    };

    return next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
      error.message = "جلسة الدخول منتهية أو غير صالحة. يرجى تسجيل الدخول مرة أخرى.";
    }
    return next(error);
  }
}

module.exports = {
  requireAuth,
};
