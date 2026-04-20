const customGameService = require('../services/customGame.service');

async function createGame(req, res, next) {
  try {
    const { title, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title and at least one question are required.'
      });
    }

    const result = await customGameService.saveCustomGame({
      title,
      questions
    });

    return res.status(201).json({
      success: true,
      gameId: result.gameId
    });
  } catch (error) {
    next(error);
  }
}

async function getGameById(req, res, next) {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Game ID is required.'
      });
    }

    const game = await customGameService.findGameById(gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found.'
      });
    }

    return res.status(200).json({
      success: true,
      game
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createGame,
  getGameById
};