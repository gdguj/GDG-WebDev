const Score = require("../models/Score.model");

const ALLOWED_GAME_TYPES = new Set(["image_guessing", "letter_cells", "survey_game"]);

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeGameType(value) {
  return String(value || "").trim();
}

async function recordAuthenticatedScore(payload) {
  const gameType = normalizeGameType(payload.gameType);
  const points = Number(payload.points);

  const email = normalizeEmail(payload.authUser && payload.authUser.email);
  const name = String((payload.authUser && payload.authUser.name) || "لاعب").trim() || "لاعب";

  if (!email) {
    throw createError("لا يوجد إيميل مرتبط بالمستخدم الحالي.", 400);
  }
  if (!ALLOWED_GAME_TYPES.has(gameType)) {
    throw createError("gameType غير مدعوم.", 400);
  }
  if (!Number.isFinite(points) || points < 0) {
    throw createError("points يجب أن تكون رقماً صالحاً >= 0.", 400);
  }

  // upsert: سجل واحد لكل إيميل يتحدث في كل مرة
  const updated = await Score.findOneAndUpdate(
    { email },
    {
      $setOnInsert: { email },
      $set: { name, lastPlayedAt: new Date(), lastGameType: gameType },
      $inc: { totalScore: points, gamesPlayed: 1 },
    },
    { upsert: true, new: true }
  ).lean();

  return updated;
}

module.exports = {
  recordAuthenticatedScore,
};
