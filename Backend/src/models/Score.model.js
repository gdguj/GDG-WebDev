const mongoose = require("mongoose");

const playerScoreSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const winnerScoreSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const scoreSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "GameSession",
      index: true,
    },
    externalSessionId: {
      type: String,
      default: null,
      trim: true,
      index: true,
      sparse: true,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    gameType: {
      type: String,
      required: true,
      enum: ["image_guessing", "letter_cells", "survey_game"],
      index: true,
    },
    players: {
      type: [playerScoreSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one player result is required.",
      },
    },
    winner: {
      type: winnerScoreSchema,
      required: true,
    },
    accountEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      index: true,
    },
    source: {
      type: String,
      default: "multiplayer",
      trim: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    playedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
    collection: "scores",
  }
);

module.exports = mongoose.model("Score", scoreSchema, "scores");
