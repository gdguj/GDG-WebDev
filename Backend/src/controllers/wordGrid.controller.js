const service = require("../services/wordGrid.service");

exports.initGame = async (req, res) => {
  try {
    const { gameType, greenName, blueName } = req.body;
    
    if (!gameType) {
      return res.status(400).json({ error: "gameType مطلوب" });
    }

    console.log(` بدء لعبة جديدة - نوع: ${gameType}`);
    
    const session = await service.createSession(gameType, greenName, blueName);
    
    console.log(`الجلسة تم إنشاؤها: ${session.sessionId} مع ${session.cells.length} خلية`);
    res.json(session);
    
  } catch (err) {
    console.error(" خطأ في initGame:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const { sessionId, team, answer, letter, playerName } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!sessionId || !team || !answer || !letter) {
      return res.status(400).json({ 
        error: "البيانات ناقصة: يجب توفير sessionId, team, answer, letter" 
      });
    }

    console.log(`التحقق من الإجابة: حرف=${letter}, فريق=${team}, اللاعب=${playerName}`);

    const result = await service.submitAnswer(
      sessionId,
      team,
      answer,
      letter,
      playerName || "Unknown Player"
    );
    
    console.log(`النتيجة: ${result.correct ? 'صحيح' : 'خطأ'}`);
    res.json(result);
    
  } catch (err) {
    console.error(" خطأ في submitAnswer:", err.message);
    res.status(400).json({ error: err.message });
  }
};