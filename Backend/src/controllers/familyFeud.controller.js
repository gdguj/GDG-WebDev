const familyFeudService = require("../services/familyFeud.service");

async function getFamilyFeud(req, res, next) {
  try {
    const questions = await familyFeudService.listQuestions();
    return res.status(200).json({
      success: true,
      questions,
    });
  } catch (error) {
    return next(error);
  }
}

async function startFamilyFeudRound(req, res, next) {
  try {
    const round = await familyFeudService.startRound(req.body || {});
    return res.status(200).json({
      success: true,
      round,
    });
  } catch (error) {
    return next(error);
  }
}

async function getRoundState(req, res, next) {
  try {
    const round = familyFeudService.getRoundState();
    return res.status(200).json({
      success: true,
      round,
    });
  } catch (error) {
    return next(error);
  }
}

async function submitAnswer(req, res, next) {
  try {
    const result = familyFeudService.submitAnswer(req.body || {});
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateCurrentTeam(req, res, next) {
  try {
    const round = familyFeudService.updateCurrentTeam(req.body || {});
    return res.status(200).json({
      success: true,
      round,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getFamilyFeud,
  startFamilyFeudRound,
  getRoundState,
  submitAnswer,
  updateCurrentTeam,
};
