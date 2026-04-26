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
    const sessionId = req.body.sessionId || req.params.sessionId;
    const session = await service.startGame({ sessionId, ...req.body });
    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    return next(error);
  }
}

async function submitAnswer(req, res, next) {
  try {
    const sessionId = req.body.sessionId || req.params.sessionId;
    const result = await service.submitAnswer({ sessionId, ...req.body });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

async function finishGame(req, res, next) {
  try {
    const sessionId = req.body.sessionId || req.params.sessionId;
    const result = await service.finishGame({ sessionId, ...req.body });
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

async function setReady(req, res, next) {
  try {
    const session = await service.setPlayerReady(req.body);
    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    return next(error);
  }
}

async function getSession(req, res, next) {
  try {
    const sessionId = req.params.sessionId || req.query.sessionId;
    const session = await service.getSessionById(sessionId);
    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    return next(error);
  }
}

async function getTemplateGames(req, res, next) {
  try {
    const games = await service.listTemplateGames(req.query);
    return res.status(200).json({ success: true, data: games });
  } catch (error) {
    return next(error);
  }
}

async function getUserGames(req, res, next) {
  try {
    const games = await service.listUserGames(req.query);
    return res.status(200).json({ success: true, data: games });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createGameSession,
  joinGameByCode,
  setReady,
  startGame,
  submitAnswer,
  finishGame,
  getLeaderboard,
  getSession,
  getTemplateGames,
  getUserGames,
};
