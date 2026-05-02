const lobbyService = require("../services/lobby.service");

async function createLobby(req, res, next) {
  try {
    const { gameId, teamNameA, teamNameB, hostName } = req.body;
    if (!gameId) {
      return res.status(400).json({ success: false, message: "gameId is required" });
    }

    const lobby = await lobbyService.createSession(gameId, {
      teamNameA: teamNameA || 'أ',
      teamNameB: teamNameB || 'ب',
      hostName: hostName || '',
    });

    return res.status(201).json({
      success: true,
      joinCode: lobby.joinCode,
      sessionId: lobby._id,
    });
  } catch (error) {
    next(error);
  }
}

async function getLobbyInfo(req, res, next) {
  try {
    const lobby = await lobbyService.getSessionInfo(req.params.code);
    if (!lobby) {
      return res.status(404).json({ success: false, message: "الكود غير صحيح أو انتهت الجلسة" });
    }

    const gameType = lobby.gameId ? lobby.gameId.gameType : null;
    const gameId = lobby.gameId ? lobby.gameId._id : null;

    res.json({
      success: true,
      joinCode: lobby.joinCode,
      status: lobby.status,
      teamNameA: lobby.teamNameA || 'أ',
      teamNameB: lobby.teamNameB || 'ب',
      hostName: lobby.hostName || '',
      gameType,
      gameId,
      players: lobby.lobbyPlayers || [],
    });
  } catch (error) {
    next(error);
  }
}

async function joinLobby(req, res, next) {
  try {
    const { code, playerName, team } = req.body;
    if (!code || !playerName || !team) {
      return res.status(400).json({ success: false, message: "code و playerName و team مطلوبة" });
    }
    if (team !== 'A' && team !== 'B') {
      return res.status(400).json({ success: false, message: "team يجب أن يكون A أو B" });
    }

    const session = await lobbyService.joinSession(code, playerName, team);
    res.json({
      success: true,
      players: session.lobbyPlayers,
      status: session.status,
    });
  } catch (error) {
    if (error.message.includes('ممتلئ') || error.message.includes('بدأت')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
}

async function startLobby(req, res, next) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: "code مطلوب" });
    }

    const session = await lobbyService.startSession(code);
    const gameType = session.gameId ? session.gameId.gameType : null;
    const gameId = session.gameId ? session.gameId._id : null;

    res.json({
      success: true,
      gameType,
      gameId,
      teamNameA: session.teamNameA || 'أ',
      teamNameB: session.teamNameB || 'ب',
    });
  } catch (error) {
    next(error);
  }
}

async function cancelLobby(req, res, next) {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "code مطلوب" });
    await lobbyService.cancelSession(code);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function getLobbyGameState(req, res, next) {
  try {
    const data = await lobbyService.getRealtimeGameState(req.params.code);
    res.json({ success: true, status: data.status, state: data.state });
  } catch (error) {
    next(error);
  }
}

async function answerLobbyGame(req, res, next) {
  try {
    const { code, team, answer, questionIndex } = req.body;
    if (!code || !team) {
      return res.status(400).json({ success: false, message: "code و team مطلوبة" });
    }

    const data = await lobbyService.submitRealtimeAnswer(code, {
      team,
      answer: answer || '',
      questionIndex,
    });

    res.json({
      success: true,
      stale: data.stale,
      isCorrect: data.isCorrect,
      awardedPoints: data.awardedPoints,
      state: data.state,
    });
  } catch (error) {
    next(error);
  }
}

async function nextLobbyGameQuestion(req, res, next) {
  try {
    const { code, questionIndex } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: "code مطلوب" });
    }

    const data = await lobbyService.skipRealtimeQuestion(code, { questionIndex });
    res.json({ success: true, stale: data.stale, state: data.state });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createLobby,
  getLobbyInfo,
  joinLobby,
  startLobby,
  cancelLobby,
  getLobbyGameState,
  answerLobbyGame,
  nextLobbyGameQuestion,
};
