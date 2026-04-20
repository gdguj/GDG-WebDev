const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  }
});

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answers: {
    type: [answerSchema],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Each question must include at least one answer.'
    }
  }
});

const customGameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  questions: {
    type: [questionSchema],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'A custom game must include at least one question.'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CustomGame', customGameSchema);
