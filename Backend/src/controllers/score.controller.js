const scoreService = require("../services/score.service");

async function recordMyScore(req, res, next) {
  try {
    const score = await scoreService.recordAuthenticatedScore({
      ...req.body,
      authUser: req.authUser,
    });

    return res.status(201).json({
      success: true,
      data: score,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  recordMyScore,
};
