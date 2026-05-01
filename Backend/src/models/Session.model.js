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
  teams: {
    green: { name: String, score: Number, words: Number },
    blue: { name: String, score: Number, words: Number }
  },
  cells: [CellSchema],
  winner: String,
  stats: {
    totalWords: Number,
    lastMoveAt: Date
  }
},
{ timestamps: true }
);

SessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } }
);

module.exports = mongoose.model("Session", SessionSchema);