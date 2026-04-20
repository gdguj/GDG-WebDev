const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");

const GameTemplate = require("../models/GameTemplate.model");
const UserGame = require("../models/UserGame.model");
const GameSession = require("../models/GameSession");
const Score = require("../models/Score.model");

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateCode = customAlphabet(JOIN_CODE_ALPHABET, 6);

const DEFAULT_SETTINGS = {
  maxPlayers: 8,
  allowTeams: false,
  timePerQuestion: 30,
};

function toObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`${fieldName} is invalid`);
  }
  return new mongoose.Types.ObjectId(value);
}

async function generateUniqueJoinCode() {
  const MAX_ATTEMPTS = 30;
  for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
    const joinCode = generateCode();
    const exists = await GameSession.exists({ joinCode });
    if (!exists) {
      return joinCode;
    }
  }
  throw new Error("Unable to generate unique joinCode");
}

async function resolveGame(gameId) {
  const parsedGameId = toObjectId(gameId, "gameId");

  const templateGame = await GameTemplate.findById(parsedGameId).lean();
  if (templateGame) {
    return templateGame;
  }

  const userGame = await UserGame.findById(parsedGameId).lean();
  if (userGame) {
    return userGame;
  }

  return null;
}

async function createGameSession(payload) {
  const { gameId, createdBy, settings = {} } = payload;

  if (!gameId) throw new Error("gameId is required");
  if (!createdBy || !createdBy.userId || !createdBy.name) {
    throw new Error("createdBy.userId and createdBy.name are required");
  }

  const game = await resolveGame(gameId);
  if (!game) {
    throw new Error("Game not found in gameTemplates or userGames");
  }

  const joinCode = await generateUniqueJoinCode();
  const creatorId = toObjectId(createdBy.userId, "createdBy.userId");
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...settings,
  };

  const session = await GameSession.create({
    gameId: game._id,
    gameType: game.gameType,
    joinCode,
    status: "waiting",
    createdBy: {
      userId: creatorId,
      name: createdBy.name,
    },
    players: [
      {
        userId: creatorId,
        name: createdBy.name,
        score: 0,
        isReady: false,
      },
    ],
    teams: [],
    currentState: {
      currentQuestionIndex: 0,
      currentTurn: creatorId,
      timeLeft: mergedSettings.timePerQuestion,
    },
    settings: mergedSettings,
  });

  return session;
}

async function joinGameByCode(payload) {
  const { joinCode, player } = payload;

  if (!joinCode) throw new Error("joinCode is required");
  if (!player || !player.userId || !player.name) {
    throw new Error("player.userId and player.name are required");
  }

  const normalizedCode = String(joinCode).trim().toUpperCase();
  const session = await GameSession.findOne({ joinCode: normalizedCode });

  if (!session) throw new Error("Session not found");
  if (session.status === "finished") {
    throw new Error("Session already finished");
  }

  const playerId = String(player.userId);
  const alreadyJoined = session.players.some((p) => String(p.userId) === playerId);
  if (alreadyJoined) {
    return session;
  }

  if (session.players.length >= session.settings.maxPlayers) {
    throw new Error("Session reached maxPlayers limit");
  }

  session.players.push({
    userId: toObjectId(player.userId, "player.userId"),
    name: player.name,
    score: 0,
    isReady: Boolean(player.isReady),
  });

  await session.save();
  return session;
}

async function startGame(payload) {
  const { sessionId } = payload;

  const parsedSessionId = toObjectId(sessionId, "sessionId");
  const session = await GameSession.findById(parsedSessionId);
  if (!session) throw new Error("Session not found");

  if (session.status === "finished") {
    throw new Error("Cannot start a finished session");
  }

  if (!session.players.length) {
    throw new Error("At least one player is required");
  }

  session.status = "in-progress";
  session.startedAt = new Date();
  if (!session.currentState.currentTurn) {
    session.currentState.currentTurn = session.players[0].userId;
  }
  if (!session.currentState.timeLeft) {
    session.currentState.timeLeft = session.settings.timePerQuestion;
  }

  await session.save();
  return session;
}

async function submitAnswer(payload) {
  const {
    sessionId,
    userId,
    isCorrect,
    points = 0,
    currentQuestionIndex,
    currentTurn,
    timeLeft,
    markReady,
  } = payload;

  const parsedSessionId = toObjectId(sessionId, "sessionId");
  const session = await GameSession.findById(parsedSessionId);
  if (!session) throw new Error("Session not found");

  if (session.status !== "in-progress") {
    throw new Error("Session must be in-progress");
  }

  const answerUserId = String(userId || "");
  const player = session.players.find((p) => String(p.userId) === answerUserId);
  if (!player) {
    throw new Error("Player not found in this session");
  }

  const awardedPoints = Number(isCorrect ? points : 0);
  if (awardedPoints > 0) {
    player.score += awardedPoints;
  }

  if (typeof markReady === "boolean") {
    player.isReady = markReady;
  }

  if (Number.isInteger(currentQuestionIndex) && currentQuestionIndex >= 0) {
    session.currentState.currentQuestionIndex = currentQuestionIndex;
  }

  if (currentTurn && mongoose.Types.ObjectId.isValid(currentTurn)) {
    session.currentState.currentTurn = new mongoose.Types.ObjectId(currentTurn);
  }

  if (Number.isFinite(timeLeft) && timeLeft >= 0) {
    session.currentState.timeLeft = timeLeft;
  }

  await session.save();
  return session;
}

async function finishGame(payload) {
  const { sessionId } = payload;

  const parsedSessionId = toObjectId(sessionId, "sessionId");
  const session = await GameSession.findById(parsedSessionId);
  if (!session) throw new Error("Session not found");

  if (session.status === "finished") {
    const existingScore = await Score.findOne({ sessionId: session._id }).lean();
    return { session, score: existingScore };
  }

  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score);
  const winnerPlayer = sortedPlayers[0] || null;

  session.status = "finished";
  session.finishedAt = new Date();
  session.winner = winnerPlayer
    ? { userId: winnerPlayer.userId, name: winnerPlayer.name }
    : { userId: null, name: "" };

  await session.save();

  const scoreDoc = await Score.create({
    sessionId: session._id,
    gameId: session.gameId,
    gameType: session.gameType,
    players: session.players.map((p) => ({ name: p.name, score: p.score })),
    winner: winnerPlayer
      ? { name: winnerPlayer.name, score: winnerPlayer.score }
      : { name: "No winner", score: 0 },
    playedAt: session.finishedAt,
  });

  return { session, score: scoreDoc };
}

async function getLeaderboard(payload) {
  const { gameType, limit = 20 } = payload;

  const query = {};
  if (gameType) {
    query.gameType = gameType;
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const leaderboard = await Score.find(query)
    .sort({ "winner.score": -1, playedAt: -1 })
    .limit(safeLimit)
    .lean();

  return leaderboard;
}

module.exports = {
  createGameSession,
  joinGameByCode,
  startGame,
  submitAnswer,
  finishGame,
  getLeaderboard,
};
