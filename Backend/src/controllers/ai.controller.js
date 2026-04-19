const SurveyGame = require("../models/SurveyGame");

async function startFamilyFeudRound(req, res, next) {
  try {
    const questions = await SurveyGame.find();

    if (!questions.length) {
      return res.status(404).json({
        success: false,
        message: "لا توجد أسئلة في survey_game"
      });
    }

    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];

    const roundState = {
      question: randomQuestion.question,
      answers: randomQuestion.answers.map((ans) => ({
        answer: ans.answer,
        points: ans.points,
        revealed: false
      })),
      currentTeam: "team1",
      wrongAttempts: 0,
      roundScore: 0,
      isStealMode: false,
      originalTeam: null,
      timestamp: new Date()
    };

    global.familyFeudRoundState = roundState;

    return res.status(200).json({
      success: true,
      message: "تم بدء جولة جديدة",
      round: roundState,
      fallback: false
    });
  } catch (err) {
    next(err);
  }
}

function getRoundState(req, res, next) {
  try {
    if (!global.familyFeudRoundState) {
      return res.status(404).json({
        success: false,
        message: "لا توجد جولة نشطة حالياً"
      });
    }

    return res.status(200).json(global.familyFeudRoundState);
  } catch (err) {
    next(err);
  }
}

function submitAnswer(req, res, next) {
  try {
    const { answer } = req.body || {};

    if (!global.familyFeudRoundState) {
      return res.status(404).json({
        success: false,
        message: "لا توجد جولة نشطة"
      });
    }

    const state = global.familyFeudRoundState;

    const normalize = (str) => {
      if (!str) return "";
      return String(str)
        .toLowerCase()
        .replace(/[\u064B-\u0652\u0640]/g, "")
        .replace(/[^\u0600-\u06FF0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^ال\s?/, "")
        .trim();
    };

    const normalizedInput = normalize(answer);

    const foundAnswer = state.answers.find(
      (ans) => !ans.revealed && normalize(ans.answer) === normalizedInput
    );

    if (foundAnswer) {
      if (state.isStealMode && state.currentTeam !== state.originalTeam) {
        const originalPoints = state.roundScore;
        state.roundScore = originalPoints;
        state.answers.forEach((a) => {
          a.revealed = true;
        });
      } else {
        state.roundScore += foundAnswer.points;
      }

      foundAnswer.revealed = true;
      global.familyFeudRoundState = state;

      return res.status(200).json({
        success: true,
        correct: true,
        message: "إجابة صحيحة!",
        answer: foundAnswer.answer,
        points: foundAnswer.points,
        roundScore: state.roundScore,
        roundState: state
      });
    } else {
      if (state.isStealMode && state.currentTeam !== state.originalTeam) {
        global.familyFeudRoundState = state;

        return res.status(200).json({
          success: true,
          correct: false,
          message: "خطأ أثناء محاولة السرقة",
          stealFailed: true,
          roundScore: state.roundScore,
          originalTeam: state.originalTeam,
          roundState: state
        });
      }

      state.wrongAttempts++;
      let message = `إجابة خاطئة (${state.wrongAttempts}/3)`;

      if (state.wrongAttempts >= 3 && !state.isStealMode) {
        state.isStealMode = true;
        state.originalTeam = state.currentTeam;
        state.currentTeam = state.currentTeam === "team1" ? "team2" : "team1";
        state.wrongAttempts = 0;
        message += " - تم تفعيل وضع السرقة!";
      }

      global.familyFeudRoundState = state;

      return res.status(200).json({
        success: true,
        correct: false,
        message,
        wrongAttempts: state.wrongAttempts,
        stealModeActivated: state.isStealMode,
        currentTeam: state.currentTeam,
        roundState: state
      });
    }
  } catch (err) {
    next(err);
  }
}

function updateCurrentTeam(req, res, next) {
  try {
    if (!global.familyFeudRoundState) {
      return res.status(404).json({
        success: false,
        message: "لا توجد جولة نشطة"
      });
    }

    const state = global.familyFeudRoundState;

    state.currentTeam = state.currentTeam === "team1" ? "team2" : "team1";
    state.wrongAttempts = 0;
    state.isStealMode = false;
    state.originalTeam = null;

    global.familyFeudRoundState = state;

    return res.status(200).json({
      success: true,
      message: "تم تحديث الفريق الحالي",
      currentTeam: state.currentTeam,
      roundState: state
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startFamilyFeudRound,
  getRoundState,
  submitAnswer,
  updateCurrentTeam
};