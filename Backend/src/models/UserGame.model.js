const mongoose = require("mongoose");

const GAME_TYPES = ["image_guessing", "letter_cells", "survey_game"];

const userGameSchema = new mongoose.Schema(
  {
    gameType: {
      type: String,
      enum: GAME_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    isCustom: {
      type: Boolean,
      default: true,
      immutable: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    versionKey: false,
    collection: "userGames",
  }
);

module.exports = mongoose.model("UserGame", userGameSchema, "userGames");
