const GameTemplate = require("../models/GameTemplate.model");

function createAppError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeArabic(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/[هة]/g, "ه")
    .replace(/[ؤئء]/g, "")
    .replace(/[^\u0600-\u06FF0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^ال\s?/, "")
    .trim();
}

function normalizeAnswerEntry(entry) {
  const answerText = String(entry.answer || entry.text || "").trim();
  if (!answerText) return null;

  const points = Number(entry.points) || 0;
  const rawKeywords = Array.isArray(entry.keywords)
    ? entry.keywords
    : Array.isArray(entry.synonyms)
      ? entry.synonyms
      : [];

  const keywords = rawKeywords
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  return {
    answer: answerText,
    points,
    keywords,
  };
}

function normalizeQuestionEntry(entry) {
  const questionText = String(entry.question || entry.text || "").trim();
  if (!questionText) return null;

  const rawAnswers = Array.isArray(entry.answers) ? entry.answers : [];
  const answers = rawAnswers.map(normalizeAnswerEntry).filter(Boolean);
  if (!answers.length) return null;

  return {
    question: questionText,
    answers,
  };
}

function pickRandom(items) {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function buildRoundPayload(round) {
  return {
    question: round.question,
    answers: round.answers.map((a) => ({
      answer: a.answer,
      points: a.points,
      keywords: a.keywords,
      // Keep old clients compatible until all UIs switch to keywords.
      synonyms: a.keywords,
      revealed: Boolean(a.revealed),
    })),
    currentTeam: round.currentTeam,
    wrongAttempts: round.wrongAttempts,
    roundScore: round.roundScore,
    isStealMode: round.isStealMode,
    originalTeam: round.originalTeam,
  };
}

let currentRound = null;

async function getMongoQuestionPool() {
  const templates = await GameTemplate.find({ gameType: "survey_game" })
    .select("data.questions")
    .lean();

  const questions = [];

  for (const template of templates) {
    const rawQuestions =
      template && template.data && Array.isArray(template.data.questions)
        ? template.data.questions
        : [];

    for (const rawQuestion of rawQuestions) {
      const normalized = normalizeQuestionEntry(rawQuestion);
      if (normalized) {
        questions.push(normalized);
      }
    }
  }

  if (!questions.length) {
    throw createAppError(
      "لا توجد أسئلة survey_game في MongoDB حالياً. أضيفوا أسئلة داخل gameTemplates أولاً.",
      404
    );
  }

  return questions;
}

async function listQuestions() {
  return getMongoQuestionPool();
}

async function startRound(payload = {}) {
  const questions = await getMongoQuestionPool();
  const starter = payload.currentTeam === "team2" ? "team2" : "team1";

  const picked = pickRandom(questions);

  currentRound = {
    question: picked.question,
    answers: picked.answers.map((a) => ({ ...a, revealed: false })),
    currentTeam: starter,
    wrongAttempts: 0,
    roundScore: 0,
    isStealMode: false,
    originalTeam: null,
  };

  return buildRoundPayload(currentRound);
}

function ensureActiveRound() {
  if (!currentRound) {
    throw createAppError("لا توجد جولة نشطة. ابدؤوا الجولة أولاً.", 400);
  }
}

function getRoundState() {
  ensureActiveRound();
  return buildRoundPayload(currentRound);
}

function updateCurrentTeam(payload = {}) {
  ensureActiveRound();
  if (payload.currentTeam !== "team1" && payload.currentTeam !== "team2") {
    throw createAppError("currentTeam يجب أن تكون team1 أو team2.", 400);
  }

  currentRound.currentTeam = payload.currentTeam;
  return buildRoundPayload(currentRound);
}

function submitAnswer(payload = {}) {
  ensureActiveRound();

  const givenAnswer = String(payload.answer || "").trim();
  if (!givenAnswer) {
    throw createAppError("answer مطلوب.", 400);
  }

  const normalizedGiven = normalizeArabic(givenAnswer);

  const matched = currentRound.answers.find((entry) => {
    if (entry.revealed) return false;

    const accepted = [entry.answer, ...(entry.keywords || []), ...(entry.synonyms || [])]
      .map((value) => normalizeArabic(value))
      .filter(Boolean);

    return accepted.includes(normalizedGiven);
  });

  if (matched) {
    matched.revealed = true;
    currentRound.roundScore += Number(matched.points) || 0;

    const allRevealed = currentRound.answers.every((a) => a.revealed);

    return {
      correct: true,
      answer: matched.answer,
      points: matched.points,
      roundScore: currentRound.roundScore,
      wrongAttempts: currentRound.wrongAttempts,
      isStealMode: currentRound.isStealMode,
      allRevealed,
      round: buildRoundPayload(currentRound),
    };
  }

  if (currentRound.isStealMode && currentRound.currentTeam !== currentRound.originalTeam) {
    return {
      correct: false,
      stealFailed: true,
      originalTeam: currentRound.originalTeam,
      roundScore: currentRound.roundScore,
      wrongAttempts: currentRound.wrongAttempts,
      round: buildRoundPayload(currentRound),
    };
  }

  currentRound.wrongAttempts += 1;

  if (!currentRound.isStealMode && currentRound.wrongAttempts >= 3) {
    currentRound.isStealMode = true;
    currentRound.originalTeam = currentRound.currentTeam;
    currentRound.currentTeam = currentRound.currentTeam === "team1" ? "team2" : "team1";
    currentRound.wrongAttempts = 0;

    return {
      correct: false,
      wrongAttempts: 3,
      stealModeActivated: true,
      currentTeam: currentRound.currentTeam,
      originalTeam: currentRound.originalTeam,
      roundScore: currentRound.roundScore,
      round: buildRoundPayload(currentRound),
    };
  }

  return {
    correct: false,
    wrongAttempts: currentRound.wrongAttempts,
    stealModeActivated: false,
    roundScore: currentRound.roundScore,
    round: buildRoundPayload(currentRound),
  };
}

module.exports = {
  listQuestions,
  startRound,
  getRoundState,
  submitAnswer,
  updateCurrentTeam,
};
