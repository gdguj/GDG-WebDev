const customGameService = require('../services/customGame.service');

async function createGame(req, res, next) {
  try {
    const {
      gameType,
      title,
      description = "",
      data,
      questions,
    } = req.body;

    const authUser = req.authUser;
    const normalizedData = data || (Array.isArray(questions) ? { questions } : null);

    if (
      !gameType ||
      !title ||
      !authUser ||
      !authUser.id ||
      !authUser.name ||
      !authUser.email ||
      !normalizedData
    ) {
      return res.status(400).json({
        success: false,
        message:
          'gameType, title, and data are required. Must be authenticated.'
      });
    }

    const validatedQuestions = Array.isArray(normalizedData.questions) ? normalizedData.questions : [];

    if (gameType === 'letter_cells') {
      if (validatedQuestions.length !== 25) {
        return res.status(400).json({
          success: false,
          message: 'لعبة الحروف يجب أن تحتوي على 25 سؤالاً بالضبط (شبكة 5×5).'
        });
      }
      for (let i = 0; i < validatedQuestions.length; i++) {
        const q = validatedQuestions[i];
        if (!q.letter || !q.question || !q.answer) {
          return res.status(400).json({
            success: false,
            message: 'السؤال رقم ' + (i + 1) + ': الحرف والسؤال والإجابة مطلوبة.'
          });
        }
      }
    }

    if (gameType === 'survey_game') {
      if (validatedQuestions.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'لعبة الاستبيان تحتاج سؤالين على الأقل.'
        });
      }

      const normalizedSurveyQuestions = [];

      for (let i = 0; i < validatedQuestions.length; i++) {
        const q = validatedQuestions[i];
        if (!q.question) {
          return res.status(400).json({
            success: false,
            message: 'السؤال رقم ' + (i + 1) + ': نص السؤال مطلوب.'
          });
        }

        const answers = Array.isArray(q.answers) ? q.answers : [];
        if (answers.length !== 10) {
          return res.status(400).json({
            success: false,
            message: 'السؤال رقم ' + (i + 1) + ': يجب أن يحتوي على 10 خيارات بالضبط.'
          });
        }

        const normalizedAnswers = [];

        for (let j = 0; j < answers.length; j++) {
          const a = answers[j];
          const answer = String(a.answer || a.text || '').trim();
          const points = Number(a.points);
          const rawKeywords = Array.isArray(a.keywords)
            ? a.keywords
            : Array.isArray(a.synonyms)
              ? a.synonyms
              : [];
          const keywords = rawKeywords
            .map((entry) => String(entry || '').trim())
            .filter(Boolean);

          if (!answer || !Number.isFinite(points) || points <= 0) {
            return res.status(400).json({
              success: false,
              message:
                'السؤال رقم ' +
                (i + 1) +
                '، الخيار رقم ' +
                (j + 1) +
                ': نص ونقاط صحيحة مطلوبة.'
            });
          }

          normalizedAnswers.push({
            answer,
            keywords,
            points,
          });
        }

        normalizedSurveyQuestions.push({
          question: String(q.question).trim(),
          answers: normalizedAnswers,
        });
      }

      normalizedData.questions = normalizedSurveyQuestions;
    }

    if (gameType === 'image_guessing') {
      if (!validatedQuestions.length) {
        return res.status(400).json({
          success: false,
          message: 'لعبة الصور تحتاج سؤالاً واحداً على الأقل.'
        });
      }
      for (let i = 0; i < validatedQuestions.length; i++) {
        const q = validatedQuestions[i];
        if (!q.imageOne || !q.imageTwo || !q.answer) {
          return res.status(400).json({
            success: false,
            message: 'السؤال رقم ' + (i + 1) + ': رابطا الصورتين والإجابة مطلوبة.'
          });
        }
      }
    }

    const result = await customGameService.saveCustomGame({
      gameType,
      title,
      description,
      createdBy: {
        userId: authUser.id,
        name: authUser.name,
        email: authUser.email,
      },
      data: normalizedData,
    });

    return res.status(201).json({
      success: true,
      gameId: result.gameId
    });
  } catch (error) {
    next(error);
  }
}

async function getGameById(req, res, next) {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Game ID is required.'
      });
    }

    const game = await customGameService.findGameById(gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found.'
      });
    }

    return res.status(200).json({
      success: true,
      game
    });
  } catch (error) {
    next(error);
  }
}

async function getMyGames(req, res, next) {
  try {
    const authUser = req.authUser;
    const gameType = String(req.query.gameType || "").trim();

    if (!authUser || !authUser.id) {
      return res.status(401).json({
        success: false,
        message: "يجب تسجيل الدخول أولاً.",
      });
    }

    const games = await customGameService.findGamesByCreator(
      {
        id: authUser.id,
        email: authUser.email,
      },
      { gameType }
    );

    return res.status(200).json({
      success: true,
      games,
    });
  } catch (error) {
    next(error);
  }
}

async function getCommunityGames(req, res, next) {
  try {
    const gameType = String(req.query.gameType || "").trim();

    const games = await customGameService.findAllCommunityGames({ gameType });

    return res.status(200).json({
      success: true,
      games,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createGame,
  getGameById,
  getMyGames,
  getCommunityGames,
};