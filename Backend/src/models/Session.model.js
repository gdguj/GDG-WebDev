const mongoose = require("mongoose");

const CellSchema = new mongoose.Schema(
{
  id: String,
  letter: String,
  questionText: String,    // نص السؤال
  answer: String,          // الإجابة الصحيحة (من GameTemplate)
  row: Number,
  col: Number,
  attempts: [String],
  claimedBy: { type: String, default: "" },
  status: { type: String, default: "empty" }
},
{ _id: false }
);

const SessionSchema = new mongoose.Schema(
{
  sessionId: { type: String, unique: true, sparse: true, index: true },
  joinCode: {
    type: String,
    uppercase: true,
    trim: true,
    unique: true,
    sparse: true,
    index: true,
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserGame",
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  difficulty: String,
  status: String,
  nowPlaying: String,
  turnEndsAt: Date,
  finishedAt: {
    type: Date,
    default: null,
  },
  teams: {
    green: { name: String, score: Number, words: Number },
    blue: { name: String, score: Number, words: Number }
  },
  cells: [CellSchema],
  winner: String,
  stats: {
    totalWords: Number,
    lastMoveAt: Date
  },
  // حقول اللوبي للألعاب المخصصة
  teamNameA: { type: String, default: 'أ' },
  teamNameB: { type: String, default: 'ب' },
  hostName: { type: String, default: '' },
  lobbyPlayers: [{
    name: { type: String, required: true },
    team: { type: String, enum: ['A', 'B'], required: true },
    joinedAt: { type: Date, default: Date.now },
    _id: false
  }],
  realtimePlay: {
    questionIndex: { type: Number, default: 0 },
    scoreA: { type: Number, default: 0 },
    scoreB: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    finished: { type: Boolean, default: false },
    revision: { type: Number, default: 0 },
    lastWinnerTeam: { type: String, enum: ['A', 'B', ''], default: '' },
    lastAction: { type: String, enum: ['none', 'correct', 'skip'], default: 'none' }
  }
},
{
  timestamps: true,
  versionKey: false,
  collection: "gamelobbies",
}
);

SessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } }
);

SessionSchema.index(
  { finishedAt: 1 },
  {
    expireAfterSeconds: 3600,
    partialFilterExpression: {
      status: { $in: ["finished", "closed", "abandoned"] },
      finishedAt: { $type: "date" },
    },
  }
);

module.exports = mongoose.model("Session", SessionSchema, "gamelobbies");