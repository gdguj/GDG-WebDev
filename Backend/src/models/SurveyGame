const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    answer: { type: String, required: true },
    points: { type: Number, required: true },
  },
  { _id: false }
);

const surveyGameSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answers: {
      type: [answerSchema],
      required: true,
      default: [],
    },
  },
  {
    collection: "survey_game",
    timestamps: false,
  }
);

module.exports = mongoose.model("SurveyGame", surveyGameSchema);