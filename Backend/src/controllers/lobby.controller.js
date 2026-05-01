const lobbyService = require("../services/lobby.service");

async function createLobby(req, res, next) {
  try {
    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ success: false, message: "gameId is required" });
    }
    
    const lobby = await lobbyService.createSession(gameId);
    
    return res.status(201).json({
      success: true,
      joinCode: lobby.joinCode
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { createLobby };