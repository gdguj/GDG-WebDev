const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  game: {
    type: String,
    enum: ['familyFeud', 'imageGuessing', 'wordGrid'],
    required: true
  },
  teams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    }
  ],
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'finished'],
    default: 'waiting'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },

  // ─── Family Feud Round State ───────────────────────────────────────────────
  familyFeudRound: {
    currentQuestion: {
      question: { type: String },
      answers: [
        {
          answer: { type: String },
          points: { type: Number },
          revealed: { type: Boolean, default: false }
        }
      ]
    },
    currentTeam: {
      type: String,
      enum: ['team1', 'team2'],
      default: 'team1'
    },
    wrongAttempts: {
      type: Number,
      default: 0
    },
    roundScore: {
      type: Number,
      default: 0
    },
    isStealMode: {
      type: Boolean,
      default: false
    },
    originalTeam: {
      type: String,
      enum: ['team1', 'team2'],
      default: null
    }
  },

  // ─── Stats (added when the game finishes) ───────────────────────────────────

  // Word Grid stats
  stats: {
    // Word Grid
    totalWordsFound: { type: Number },
    longestWord: {
      word: { type: String },
      teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
    },
    highestStreak: {
      count: { type: Number },
      teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
    },
    fastestAnswer: {
      seconds: { type: Number },
      teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
    },
    wordsPerTeam: [
      {
        teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        wordsFound: { type: Number }
      }
    ],

    // Guess the Word stats
    wordsScored: { type: Number }

    // Family Feud → no extra stats needed.
    // Winner & score are already stored in `winner` + the Teams collection.
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  finishedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('GameSession', gameSessionSchema);
