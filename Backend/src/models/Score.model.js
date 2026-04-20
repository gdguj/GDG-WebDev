const mongoose = require("mongoose");

const playerScoreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
    name: {
      type: String,
      required: true,
      trim: true,
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
      required: true,
      ref: "GameSession",
      index: true,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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
