const service = require("../services/gameSession.service");

async function createGameSession(req, res, next) {
  try {
    const session = await service.createGameSession(req.body);
    return res.status(201).json({ success: true, data: session });
  } catch (error) {
    return next(error);
  }
}

async function joinGameByCode(req, res, next) {
  try {
    const session = await service.joinGameByCode(req.body);
    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    return next(error);
  }
}

async function startGame(req, res, next) {
  try {
    const session = await service.startGame({
      sessionId: req.params.sessionId,
      ...req.body,
    });
    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    return next(error);
  }
}

async function submitAnswer(req, res, next) {
  try {
    const session = await service.submitAnswer({
      sessionId: req.params.sessionId,
      ...req.body,
    });
    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    return next(error);
  }
}

async function finishGame(req, res, next) {
  try {
    const result = await service.finishGame({
      sessionId: req.params.sessionId,
      ...req.body,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

async function getLeaderboard(req, res, next) {
  try {
    const leaderboard = await service.getLeaderboard(req.query);
    return res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createGameSession,
  joinGameByCode,
  startGame,
  submitAnswer,
  finishGame,
  getLeaderboard,
};
