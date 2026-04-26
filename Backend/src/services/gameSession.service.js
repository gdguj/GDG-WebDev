const mongoose = require("mongoose");

const GameTemplate = require("../models/GameTemplate.model");
const UserGame = require("../models/UserGame.model");
const GameSession = require("../models/GameSession");
const Score = require("../models/Score.model");

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_SETTINGS = {
  maxPlayers: 8,
  allowTeams: false,
  timePerQuestion: 30,
  joinCodeLength: 6,
};

let realtimeEmitter = () => {};

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createError(`${fieldName} غير صالح`);
  }
  return new mongoose.Types.ObjectId(value);
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function generateJoinCode(length) {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * JOIN_CODE_ALPHABET.length);
    code += JOIN_CODE_ALPHABET[index];
  }
  return code;
}

async function generateUniqueJoinCode(rawLength) {
  const length = Math.min(Math.max(Number(rawLength) || 6, 4), 6);
  const MAX_ATTEMPTS = 60;

  for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
    const joinCode = generateJoinCode(length);
    const exists = await GameSession.exists({ joinCode });
    if (!exists) {
      return joinCode;
    }
  }

  throw createError("تعذر إنشاء كود انضمام فريد", 500);
}

function buildGameSnapshot(game) {
  return {
    _id: game._id,
    gameType: game.gameType,
    title: game.title,
    description: game.description || "",
    data: game.data || {},
    source: game.isCustom ? "userGames" : "gameTemplates",
  };
}

function getQuestions(snapshot) {
  const questions = snapshot && snapshot.data && snapshot.data.questions;
  return Array.isArray(questions) ? questions : [];
}

async function resolveGame(gameId, source) {
  const parsedGameId = toObjectId(gameId, "gameId");

  if (source === "template") {
    return GameTemplate.findById(parsedGameId).lean();
  }

  if (source === "user") {
    return UserGame.findById(parsedGameId).lean();
  }

  const templateGame = await GameTemplate.findById(parsedGameId).lean();
  if (templateGame) {
    return templateGame;
  }

  return UserGame.findById(parsedGameId).lean();
}

function resetQuestionTimer(session) {
  const now = new Date();
  const seconds = Number(session.settings.timePerQuestion) || 30;
  session.currentState.timeLeft = seconds;
  session.currentState.questionTimerSeconds = seconds;
  session.currentState.questionStartedAt = now;
  session.currentState.questionEndsAt = new Date(now.getTime() + seconds * 1000);
}

function emitSession(eventName, session) {
  realtimeEmitter(eventName, session);
}

async function listTemplateGames(payload = {}) {
  const gameType = String(payload.gameType || "").trim();
  const query = {};
  if (gameType) {
    query.gameType = gameType;
  }

  return GameTemplate.find(query)
    .sort({ createdAt: -1 })
    .select("_id gameType title description data createdAt")
    .lean();
}

async function listUserGames(payload = {}) {
  const gameType = String(payload.gameType || "").trim();
  const query = {};
  if (gameType) {
    query.gameType = gameType;
  }

  return UserGame.find(query)
    .sort({ createdAt: -1 })
    .select("_id gameType title description data createdBy createdAt")
    .lean();
}

async function createGameSession(payload) {
  const { gameId, gameSource, createdBy, settings = {} } = payload;

  if (!gameId) throw createError("gameId is required");
  if (!createdBy || !createdBy.userId || !createdBy.name) {
    throw createError("createdBy.userId و createdBy.name مطلوبان");
  }

  const game = await resolveGame(gameId, gameSource);
  if (!game) {
    throw createError("اللعبة غير موجودة في gameTemplates أو userGames", 404);
  }

  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...settings,
  };
  mergedSettings.maxPlayers = Math.min(Math.max(Number(mergedSettings.maxPlayers) || 8, 2), 20);
  mergedSettings.timePerQuestion = Math.min(Math.max(Number(mergedSettings.timePerQuestion) || 30, 5), 180);

  const joinCode = await generateUniqueJoinCode(mergedSettings.joinCodeLength);
  const creatorId = toObjectId(createdBy.userId, "createdBy.userId");
  const snapshot = buildGameSnapshot(game);

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
      questionTimerSeconds: mergedSettings.timePerQuestion,
      questionStartedAt: null,
      questionEndsAt: null,
      revealedAnswers: [],
      answeredKeys: [],
    },
    settings: mergedSettings,
    gameSnapshot: snapshot,
  });

  emitSession("session:created", session);
  return session;
}

async function getSessionById(sessionId) {
  const parsedSessionId = toObjectId(sessionId, "sessionId");
  const session = await GameSession.findById(parsedSessionId);
  if (!session) {
    throw createError("الجلسة غير موجودة", 404);
  }
  return session;
}

async function joinGameByCode(payload) {
  const { joinCode, player } = payload;

  if (!joinCode) throw createError("joinCode مطلوب");
  if (!player || !player.userId || !player.name) {
    throw createError("player.userId و player.name مطلوبان");
  }

  const normalizedCode = String(joinCode).trim().toUpperCase();
  const session = await GameSession.findOne({ joinCode: normalizedCode });

  if (!session) throw createError("الجلسة غير موجودة", 404);
  if (session.status === "finished") {
    throw createError("الجلسة منتهية بالفعل");
  }

  const playerId = String(player.userId);
  const alreadyJoined = session.players.some((p) => String(p.userId) === playerId);
  if (alreadyJoined) {
    return session;
  }

  if (session.players.length >= session.settings.maxPlayers) {
    throw createError("تم الوصول إلى الحد الأقصى لعدد اللاعبين");
  }

  session.players.push({
    userId: toObjectId(player.userId, "player.userId"),
    name: player.name,
    score: 0,
    isReady: Boolean(player.isReady),
  });

  await session.save();
  emitSession("session:updated", session);
  return session;
}

async function setPlayerReady(payload) {
  const { sessionId, userId, isReady } = payload;

  if (typeof isReady !== "boolean") {
    throw createError("isReady يجب أن تكون قيمة منطقية");
  }

  const session = await getSessionById(sessionId);
  if (session.status !== "waiting") {
    throw createError("لا يمكن تغيير الجاهزية إلا أثناء حالة الانتظار");
  }

  const player = session.players.find((p) => String(p.userId) === String(userId));
  if (!player) {
    throw createError("اللاعب غير موجود في الجلسة", 404);
  }

  player.isReady = isReady;
  await session.save();
  emitSession("session:updated", session);
  return session;
}

async function startGame(payload) {
  const { sessionId, userId } = payload;
  const session = await getSessionById(sessionId);

  if (!userId) {
    throw createError("userId مطلوب لبدء اللعبة");
  }

  if (String(session.createdBy.userId) !== String(userId)) {
    throw createError("المضيف فقط يمكنه بدء اللعبة");
  }

  if (session.status === "finished") {
    throw createError("لا يمكن بدء جلسة منتهية");
  }
  if (session.status === "in-progress") {
    return session;
  }
  if (session.players.length < 2) {
    throw createError("مطلوب لاعبان على الأقل لبدء اللعبة");
  }

  const allReady = session.players.every((player) => Boolean(player.isReady));
  if (!allReady) {
    throw createError("يجب أن يكون جميع اللاعبين جاهزين قبل البدء");
  }

  const questions = getQuestions(session.gameSnapshot);
  if (!questions.length) {
    throw createError("اللعبة المختارة لا تحتوي على أسئلة", 400);
  }

  session.status = "in-progress";
  session.startedAt = new Date();
  session.currentState.currentQuestionIndex = 0;
  session.currentState.currentTurn = session.players[0].userId;
  session.currentState.revealedAnswers = [];
  session.currentState.answeredKeys = [];
  resetQuestionTimer(session);

  await session.save();
  emitSession("session:started", session);
  return session;
}

function isQuestionTimedOut(session) {
  const endsAt = session.currentState.questionEndsAt;
  if (!endsAt) {
    return false;
  }
  return Date.now() > new Date(endsAt).getTime();
}

function resolveQuestion(session, payload) {
  const questions = getQuestions(session.gameSnapshot);
  const defaultIndex = Number(session.currentState.currentQuestionIndex) || 0;
  const index = Number.isInteger(payload.currentQuestionIndex)
    ? payload.currentQuestionIndex
    : defaultIndex;
  const question = questions[index];

  if (!question) {
    throw createError("السؤال غير موجود", 404);
  }

  return { question, index, totalQuestions: questions.length };
}

function evaluateImageAnswer(session, player, payload, context) {
  const given = normalizeText(payload.answer);
  const expected = normalizeText(context.question.answer);
  const isCorrect = Boolean(given) && given === expected;
  const questionKey = `image:${context.index}`;
  const alreadySolved = session.currentState.answeredKeys.includes(questionKey);

  const awardedPoints = isCorrect && !alreadySolved ? Number(context.question.points) || 10 : 0;
  if (awardedPoints > 0) {
    player.score += awardedPoints;
    session.currentState.answeredKeys.push(questionKey);
  }

  const shouldAdvance = Boolean(payload.advanceQuestion) || (isCorrect && !alreadySolved);
  return { isCorrect, awardedPoints, shouldAdvance };
}

function evaluateLetterAnswer(session, player, payload, context) {
  const given = normalizeText(payload.answer);
  const expected = normalizeText(context.question.answer);
  const letter = String(payload.letter || context.question.letter || "").trim().toUpperCase();
  const isCorrect = Boolean(given) && given === expected;
  const answerKey = `letter:${context.index}:${letter}:${String(player.userId)}`;
  const duplicate = session.currentState.answeredKeys.includes(answerKey);

  const awardedPoints = isCorrect && !duplicate ? Number(context.question.points) || 5 : 0;
  if (awardedPoints > 0) {
    player.score += awardedPoints;
    session.currentState.answeredKeys.push(answerKey);
  }

  return {
    isCorrect,
    awardedPoints,
    shouldAdvance: Boolean(payload.advanceQuestion),
  };
}

function evaluateSurveyAnswer(session, player, payload, context) {
  const given = normalizeText(payload.answer);
  const answers = Array.isArray(context.question.answers) ? context.question.answers : [];
  const matched = answers.find((item) => normalizeText(item.text) === given);
  const answerKey = matched ? normalizeText(matched.text) : "";
  const alreadyRevealed = answerKey && session.currentState.revealedAnswers.includes(answerKey);
  const isCorrect = Boolean(matched) && !alreadyRevealed;

  const awardedPoints = isCorrect ? Number(matched.points) || 0 : 0;
  if (awardedPoints > 0) {
    player.score += awardedPoints;
    session.currentState.revealedAnswers.push(answerKey);
  }

  const shouldAdvance =
    Boolean(payload.advanceQuestion) ||
    (answers.length > 0 && session.currentState.revealedAnswers.length >= answers.length);

  return {
    isCorrect,
    awardedPoints,
    shouldAdvance,
    revealedAnswers: session.currentState.revealedAnswers,
  };
}

function advanceQuestion(session, nextIndex, totalQuestions) {
  if (nextIndex >= totalQuestions) {
    return false;
  }

  session.currentState.currentQuestionIndex = nextIndex;
  session.currentState.revealedAnswers = [];
  resetQuestionTimer(session);
  return true;
}

async function submitAnswer(payload) {
  const { sessionId, userId } = payload;
  const session = await getSessionById(sessionId);

  if (session.status !== "in-progress") {
    throw createError("يجب أن تكون الجلسة قيد التقدم");
  }
  if (isQuestionTimedOut(session)) {
    throw createError("انتهى وقت السؤال");
  }

  const player = session.players.find((entry) => String(entry.userId) === String(userId));
  if (!player) {
    throw createError("اللاعب غير موجود في هذه الجلسة", 404);
  }

  const context = resolveQuestion(session, payload);
  let evaluation;

  if (session.gameType === "image_guessing") {
    evaluation = evaluateImageAnswer(session, player, payload, context);
  } else if (session.gameType === "letter_cells") {
    evaluation = evaluateLetterAnswer(session, player, payload, context);
  } else if (session.gameType === "survey_game") {
    evaluation = evaluateSurveyAnswer(session, player, payload, context);
  } else {
    throw createError("نوع اللعبة غير مدعوم", 400);
  }

  const nextIndex = context.index + 1;
  if (evaluation.shouldAdvance) {
    const hasNext = advanceQuestion(session, nextIndex, context.totalQuestions);
    if (!hasNext) {
      session.currentState.currentQuestionIndex = context.totalQuestions;
    }
  }

  await session.save();

  if (evaluation.shouldAdvance && nextIndex >= context.totalQuestions) {
    await finishGame({ sessionId: session._id });
    const finishedSession = await getSessionById(session._id);
    return {
      session: finishedSession,
      isCorrect: evaluation.isCorrect,
      awardedPoints: evaluation.awardedPoints,
      autoFinished: true,
    };
  }

  emitSession("session:updated", session);
  return {
    session,
    isCorrect: evaluation.isCorrect,
    awardedPoints: evaluation.awardedPoints,
    revealedAnswers: evaluation.revealedAnswers || [],
  };
}

async function finishGame(payload) {
  const { sessionId } = payload;
  const session = await getSessionById(sessionId);

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
    : { userId: null, name: "لا يوجد فائز" };

  await session.save();

  const existingScore = await Score.findOne({ sessionId: session._id });
  const scoreDoc =
    existingScore ||
    (await Score.create({
      sessionId: session._id,
      gameId: session.gameId,
      gameType: session.gameType,
      players: session.players.map((player) => ({
        userId: player.userId || null,
        name: player.name,
        score: player.score,
      })),
      winner: winnerPlayer
        ? {
            userId: winnerPlayer.userId,
            name: winnerPlayer.name,
            score: winnerPlayer.score,
          }
        : {
            userId: null,
            name: "لا يوجد فائز",
            score: 0,
          },
      playedAt: session.finishedAt,
    }));

  emitSession("session:finished", session);
  return { session, score: scoreDoc };
}

async function getLeaderboard(payload = {}) {
  const gameType = String(payload.gameType || "").trim();
  const safeLimit = Math.min(Math.max(Number(payload.limit) || 20, 1), 100);

  const pipeline = [];

  if (gameType) {
    pipeline.push({
      $match: { gameType },
    });
  }

  pipeline.push({ $unwind: "$players" });
  pipeline.push({
    $group: {
      _id: {
        userId: "$players.userId",
        name: "$players.name",
      },
      totalScore: { $sum: "$players.score" },
      gamesPlayed: { $sum: 1 },
      bestSingleGame: { $max: "$players.score" },
    },
  });
  pipeline.push({
    $project: {
      _id: 0,
      userId: "$_id.userId",
      name: "$_id.name",
      totalScore: 1,
      gamesPlayed: 1,
      bestSingleGame: 1,
    },
  });
  pipeline.push({ $sort: { totalScore: -1, bestSingleGame: -1, name: 1 } });
  pipeline.push({ $limit: safeLimit });

  return Score.aggregate(pipeline);
}

function setRealtimeEmitter(emitter) {
  realtimeEmitter = typeof emitter === "function" ? emitter : () => {};
}

module.exports = {
  createGameSession,
  getSessionById,
  joinGameByCode,
  setPlayerReady,
  startGame,
  submitAnswer,
  finishGame,
  getLeaderboard,
  listTemplateGames,
  listUserGames,
  setRealtimeEmitter,
};
