const customGameService = require('../services/customGame.service');

async function createGame(req, res, next) {
  try {
    const {
      gameType,
      title,
      description = "",
      data,
      questions,
    } = req.body;

    const authUser = req.authUser;
    const normalizedData = data || (Array.isArray(questions) ? { questions } : null);

    if (
      !gameType ||
      !title ||
      !authUser ||
      !authUser.id ||
      !authUser.name ||
      !authUser.email ||
      !normalizedData
    ) {
      return res.status(400).json({
        success: false,
        message:
          'gameType, title, and data are required. Must be authenticated.'
      });
    }

    const result = await customGameService.saveCustomGame({
      gameType,
      title,
      description,
      createdBy: {
        userId: authUser.id,
        name: authUser.name,
        email: authUser.email,
      },
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
    const authUser = req.authUser;
    const gameType = String(req.query.gameType || "").trim();

    if (!authUser || !authUser.id) {
      return res.status(401).json({
        success: false,
        message: "يجب تسجيل الدخول أولاً.",
      });
    }

    const games = await customGameService.findGamesByCreator(
      {
        id: authUser.id,
        email: authUser.email,
      },
      { gameType }
    );

    return res.status(200).json({
      success: true,
      games,
    });
  } catch (error) {
    next(error);
  }
}

async function getCommunityGames(req, res, next) {
  try {
    const gameType = String(req.query.gameType || "").trim();

    const games = await customGameService.findAllCommunityGames({ gameType });

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
  getCommunityGames,
};