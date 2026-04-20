const authService = require("../services/auth.service");

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب بنجاح.",
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json({
      success: true,
      message: "تم تسجيل الدخول بنجاح.",
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    return next(error);
  }
}

async function googleLogin(req, res, next) {
  try {
    const result = await authService.loginWithGoogle(req.body);
    return res.status(200).json({
      success: true,
      message: "تم تسجيل الدخول عبر Google بنجاح.",
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    return next(error);
  }
}

async function googleConfig(req, res, next) {
  try {
    const config = authService.getGoogleConfig();
    return res.status(200).json({
      success: true,
      ...config,
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getUserById(req.authUser.id);
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  googleLogin,
  googleConfig,
  me,
};
