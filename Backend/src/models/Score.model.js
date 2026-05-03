const mongoose = require("mongoose");

// كولكشن سكور: سجل واحد لكل مستخدم (يتحدث بدل ما يتكرر)
const scoreSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
    wins: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPlayedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastGameType: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "scores",
  }
);

module.exports = mongoose.model("Score", scoreSchema, "scores");
