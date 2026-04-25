const customGameService = require('../services/customGame.service');

async function createGame(req, res, next) {
  try {
    const {
      gameType,
      title,
      description = "",
      createdBy,
      data,
      questions,
    } = req.body;

    const normalizedData = data || (Array.isArray(questions) ? { questions } : null);

    if (
      !gameType ||
      !title ||
      !createdBy ||
      !createdBy.userId ||
      !createdBy.name ||
      !createdBy.email ||
      !normalizedData
    ) {
      return res.status(400).json({
        success: false,
        message:
          'gameType, title, createdBy(userId,name,email), and data are required.'
      });
    }

    const result = await customGameService.saveCustomGame({
      gameType,
      title,
      description,
      createdBy,
      data: normalizedData,
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

async function getMyGames(req, res, next) {
  try {
    const authUserId = req.authUser && req.authUser.id;
    const gameType = String(req.query.gameType || "").trim();

    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message: "يجب تسجيل الدخول أولاً.",
      });
    }

    const games = await customGameService.findGamesByCreator(authUserId, { gameType });

    return res.status(200).json({
      success: true,
      games,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createGame,
  getGameById,
  getMyGames,
};