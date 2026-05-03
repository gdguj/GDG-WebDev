const Session = require("../models/Session.model");

const POINTS_PER_ANSWER = 2;

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeArabicFull(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/[ؤئء]/g, "")
    .replace(/[^\u0600-\u06FF0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^ال\s?/, "")
    .replace(/\s+ال\s?/g, " ")
    .trim();
}

function levenshteinDistance(a, b) {
  const len1 = a.length;
  const len2 = b.length;
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));
  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let i = 0; i <= len2; i++) matrix[i][0] = i;
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[len2][len1];
}

function matchAnswer(userInput, expectedAnswer) {
  const normalized = normalizeArabicFull(userInput);
  const expected = normalizeArabicFull(expectedAnswer);
  if (!normalized || !expected) return false;
  if (normalized === expected) return true;
  const userWords = normalized.split(" ").filter(Boolean);
  const expectedWords = expected.split(" ").filter(Boolean);
  if (userWords.length > 0 && expectedWords.length > 1) {
    for (const word of expectedWords) {
      if (userWords.some((w) => w === word)) return true;
    }
  }
  if (levenshteinDistance(normalized, expected) === 1) return true;
  return false;
}

function getQuestions(session) {
  const questions = session && session.gameId && session.gameId.data && session.gameId.data.questions;
  return Array.isArray(questions) ? questions : [];
}

function ensureRealtimePlayState(session, totalQuestions) {
  if (!session.realtimePlay) {
    session.realtimePlay = {};
  }

  if (typeof session.realtimePlay.questionIndex !== "number") session.realtimePlay.questionIndex = 0;
  if (typeof session.realtimePlay.scoreA !== "number") session.realtimePlay.scoreA = 0;
  if (typeof session.realtimePlay.scoreB !== "number") session.realtimePlay.scoreB = 0;
  if (typeof session.realtimePlay.correctCount !== "number") session.realtimePlay.correctCount = 0;
  if (typeof session.realtimePlay.totalQuestions !== "number") {
    session.realtimePlay.totalQuestions = Number(totalQuestions) || 0;
  }
  if (typeof session.realtimePlay.finished !== "boolean") session.realtimePlay.finished = false;
  if (typeof session.realtimePlay.revision !== "number") session.realtimePlay.revision = 0;
  if (typeof session.realtimePlay.lastWinnerTeam !== "string") session.realtimePlay.lastWinnerTeam = "";
  if (typeof session.realtimePlay.lastAction !== "string") session.realtimePlay.lastAction = "none";

  if (session.realtimePlay.totalQuestions !== Number(totalQuestions || 0)) {
    session.realtimePlay.totalQuestions = Number(totalQuestions || 0);
  }
}

function toRealtimeState(session) {
  const state = session.realtimePlay || {};
  return {
    questionIndex: Number(state.questionIndex || 0),
    scoreA: Number(state.scoreA || 0),
    scoreB: Number(state.scoreB || 0),
    correctCount: Number(state.correctCount || 0),
    totalQuestions: Number(state.totalQuestions || 0),
    finished: Boolean(state.finished),
    revision: Number(state.revision || 0),
    lastWinnerTeam: state.lastWinnerTeam || "",
    lastAction: state.lastAction || "none",
  };
}

async function createSession(gameId, { teamNameA = 'أ', teamNameB = 'ب', hostName = '' } = {}) {
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // ساعتان

  const newSession = await Session.create({
    sessionId: `lobby_${joinCode}`,
    status: "lobby",
    gameId,
    joinCode,
    expiresAt,
    teamNameA,
    teamNameB,
    hostName,
    lobbyPlayers: [],
  });

  return newSession;
}

async function getSessionByCode(joinCode) {
  return Session.findOne({
    joinCode: joinCode.toUpperCase(),
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).populate("gameId");
}

async function getSessionInfo(joinCode) {
  return Session.findOne({ joinCode: joinCode.toUpperCase() }).populate("gameId");
}

async function joinSession(joinCode, playerName, team) {
  const session = await Session.findOne({ joinCode: joinCode.toUpperCase() });
  if (!session) throw new Error("الكود غير صحيح أو انتهت الجلسة");
  if (session.status === "finished") throw new Error("انتهت اللعبة بالفعل، هذا الكود لم يعد صالحاً");
  if (session.status === "started") throw new Error("اللعبة بدأت بالفعل");

  // إزالة اللاعب من أي فريق كان فيه مسبقاً (حتى لا يكون في فريقين)
  session.lobbyPlayers = (session.lobbyPlayers || []).filter(p => p.name !== playerName);

  const teamPlayers = session.lobbyPlayers.filter(p => p.team === team);
  if (teamPlayers.length >= 4) throw new Error("الفريق ممتلئ (الحد الأقصى 4 لاعبين)");

  session.lobbyPlayers.push({ name: playerName, team, joinedAt: new Date() });
  await session.save();
  return session;
}

async function startSession(joinCode) {
  const session = await Session.findOne({ joinCode: joinCode.toUpperCase() }).populate("gameId");
  if (!session) throw new Error("الجلسة غير موجودة");
  session.status = "started";
  const totalQuestions = getQuestions(session).length;
  ensureRealtimePlayState(session, totalQuestions);
  session.realtimePlay.questionIndex = 0;
  session.realtimePlay.scoreA = 0;
  session.realtimePlay.scoreB = 0;
  session.realtimePlay.correctCount = 0;
  session.realtimePlay.finished = false;
  session.realtimePlay.revision += 1;
  session.realtimePlay.lastWinnerTeam = "";
  session.realtimePlay.lastAction = "none";
  await session.save();
  return session;
}

async function cancelSession(joinCode) {
  await Session.deleteOne({ joinCode: joinCode.toUpperCase() });
}

async function getRealtimeGameState(joinCode) {
  const session = await Session.findOne({ joinCode: joinCode.toUpperCase() }).populate("gameId");
  if (!session) throw new Error("الكود غير صحيح أو انتهت الجلسة");

  const totalQuestions = getQuestions(session).length;
  ensureRealtimePlayState(session, totalQuestions);
  await session.save();

  return {
    status: session.status,
    state: toRealtimeState(session),
  };
}

async function submitRealtimeAnswer(joinCode, { team, answer, questionIndex }) {
  const session = await Session.findOne({ joinCode: joinCode.toUpperCase() }).populate("gameId");
  if (!session) throw new Error("الكود غير صحيح أو انتهت الجلسة");
  if (session.status !== "started") throw new Error("اللعبة ليست قيد التقدم");
  if (team !== "A" && team !== "B") throw new Error("team يجب أن يكون A أو B");

  const questions = getQuestions(session);
  ensureRealtimePlayState(session, questions.length);

  const state = session.realtimePlay;
  const currentIndex = Number(state.questionIndex || 0);
  const requestedIndex = Number(questionIndex);

  if (state.finished || currentIndex >= questions.length) {
    state.finished = true;
    session.status = "finished";
    await session.save();
    return { stale: true, isCorrect: false, awardedPoints: 0, state: toRealtimeState(session) };
  }

  if (!Number.isFinite(requestedIndex) || requestedIndex !== currentIndex) {
    return { stale: true, isCorrect: false, awardedPoints: 0, state: toRealtimeState(session) };
  }

  const q = questions[currentIndex] || {};
  const answers = Array.isArray(q.answers)
    ? q.answers
    : (q.answer ? [q.answer] : []);
  const isCorrect = answers.some((item) => matchAnswer(answer, String(item || "")));

  if (!isCorrect) {
    return { stale: false, isCorrect: false, awardedPoints: 0, state: toRealtimeState(session) };
  }

  if (team === "A") state.scoreA += POINTS_PER_ANSWER;
  if (team === "B") state.scoreB += POINTS_PER_ANSWER;
  state.correctCount += 1;
  state.lastWinnerTeam = team;
  state.lastAction = "correct";
  state.questionIndex = currentIndex + 1;
  state.revision += 1;

  if (state.questionIndex >= questions.length) {
    state.finished = true;
    session.status = "finished";
    session.finishedAt = new Date();
  }

  await session.save();
  return { stale: false, isCorrect: true, awardedPoints: POINTS_PER_ANSWER, state: toRealtimeState(session) };
}

async function skipRealtimeQuestion(joinCode, { questionIndex }) {
  const session = await Session.findOne({ joinCode: joinCode.toUpperCase() }).populate("gameId");
  if (!session) throw new Error("الكود غير صحيح أو انتهت الجلسة");
  if (session.status !== "started") throw new Error("اللعبة ليست قيد التقدم");

  const questions = getQuestions(session);
  ensureRealtimePlayState(session, questions.length);

  const state = session.realtimePlay;
  const currentIndex = Number(state.questionIndex || 0);
  const requestedIndex = Number(questionIndex);

  if (state.finished || currentIndex >= questions.length) {
    state.finished = true;
    session.status = "finished";
    await session.save();
    return { stale: true, state: toRealtimeState(session) };
  }

  if (!Number.isFinite(requestedIndex) || requestedIndex !== currentIndex) {
    return { stale: true, state: toRealtimeState(session) };
  }

  state.lastWinnerTeam = "";
  state.lastAction = "skip";
  state.questionIndex = currentIndex + 1;
  state.revision += 1;

  if (state.questionIndex >= questions.length) {
    state.finished = true;
    session.status = "finished";
    session.finishedAt = new Date();
  }

  await session.save();
  return { stale: false, state: toRealtimeState(session) };
}

module.exports = {
  createSession,
  getSessionByCode,
  getSessionInfo,
  joinSession,
  startSession,
  cancelSession,
  getRealtimeGameState,
  submitRealtimeAnswer,
  skipRealtimeQuestion,
};
