const mongoose = require("mongoose");

const GAME_TYPES = ["image_guessing", "letter_cells", "survey_game"];

const playerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    isReady: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  { _id: false }
);

const currentStateSchema = new mongoose.Schema(
  {
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentTurn: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    timeLeft: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionStartedAt: {
      type: Date,
      default: null,
    },
    questionEndsAt: {
      type: Date,
      default: null,
    },
    questionTimerSeconds: {
      type: Number,
      default: 30,
      min: 1,
    },
    revealedAnswers: {
      type: [String],
      default: [],
    },
    answeredKeys: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const winnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const gameSessionSchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    gameType: {
      type: String,
      enum: GAME_TYPES,
      required: true,
      index: true,
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["waiting", "in-progress", "finished"],
      default: "waiting",
      index: true,
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
    },
    players: {
      type: [playerSchema],
      default: [],
    },
    teams: {
      type: [teamSchema],
      default: [],
    },
    currentState: {
      type: currentStateSchema,
      default: () => ({ currentQuestionIndex: 0, currentTurn: null, timeLeft: 0 }),
    },
    winner: {
      type: winnerSchema,
      default: () => ({ userId: null, name: "" }),
    },
    settings: {
      maxPlayers: {
        type: Number,
        default: 8,
        min: 2,
      },
      allowTeams: {
        type: Boolean,
        default: false,
      },
      timePerQuestion: {
        type: Number,
        default: 30,
        min: 5,
      },
    },
    gameSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
    collection: "gameSessions",
  }
);

gameSessionSchema.index(
  { finishedAt: 1 },
  {
    expireAfterSeconds: 86400,
    partialFilterExpression: { status: "finished", finishedAt: { $type: "date" } },
  }
);

module.exports = mongoose.model("GameSession", gameSessionSchema, "gameSessions");
