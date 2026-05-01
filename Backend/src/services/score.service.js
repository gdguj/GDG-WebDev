const mongoose = require("mongoose");
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
  const externalSessionId = String(payload.externalSessionId || "").trim() || null;
  const source = String(payload.source || "local").trim() || "local";
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : null;

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

  if (externalSessionId) {
    const existing = await Score.findOne({ externalSessionId, accountEmail: email }).lean();
    if (existing) {
      return existing;
    }
  }

  const created = await Score.create({
    sessionId: new mongoose.Types.ObjectId(),
    externalSessionId,
    gameId: null,
    gameType,
    players: [
      {
        userId: null,
        name,
        email,
        score: points,
      },
    ],
    winner: {
      userId: null,
      name,
      email,
      score: points,
    },
    accountEmail: email,
    source,
    metadata,
    playedAt: new Date(),
  });

  return created.toObject();
}

module.exports = {
  recordAuthenticatedScore,
};
