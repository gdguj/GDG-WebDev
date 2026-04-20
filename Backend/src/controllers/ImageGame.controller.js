const { createGame, getGameBySession, submitAnswer, endGame } = require("../services/imageGame.service");

// POST /image-game/create
exports.createGame = async (req, res, next) => {
  try {
    const { rounds, createdBy } = req.body;
    const game = await createGame(rounds, createdBy);
    res.status(201).json(game);
  } catch (err) {
    next(err); //passes to your errorMiddleware
  }
};

// GET /image-game/:sessionId
exports.getGame = async (req, res, next) => {
  try {
    const game = await getGameBySession(req.params.sessionId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    res.status(200).json(game);
  } catch (err) {
    next(err);
  }
};

// POST /image-game/:sessionId/answer
exports.submitAnswer = async (req, res, next) => {
  try {
    const { teamId, answer } = req.body;
    const game = await submitAnswer(req.params.sessionId, teamId, answer);
    res.status(200).json(game);
  } catch (err) {
    next(err);
  }
};

// PATCH /image-game/:sessionId/end
exports.endGame = async (req, res, next) => {
  try {
    const game = await endGame(req.params.sessionId);
    res.status(200).json(game);
  } catch (err) {
    next(err);
  }
};