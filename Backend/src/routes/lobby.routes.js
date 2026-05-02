const express = require('express');
const router = express.Router();
const lobbyController = require('../controllers/lobby.controller');
const lobbyService = require('../services/lobby.service');

router.post('/create', lobbyController.createLobby);
router.get('/info/:code', lobbyController.getLobbyInfo);
router.post('/join', lobbyController.joinLobby);
router.post('/start', lobbyController.startLobby);
router.get('/game-state/:code', lobbyController.getLobbyGameState);
router.post('/game-answer', lobbyController.answerLobbyGame);
router.post('/game-next', lobbyController.nextLobbyGameQuestion);
router.post('/cancel', express.text({ type: '*/*' }), async (req, res, next) => {
  try {
    let code;
    if (typeof req.body === 'string') {
      // sendBeacon يرسل JSON كـ text/plain
      const parsed = JSON.parse(req.body);
      code = parsed.code;
    } else {
      code = req.body && req.body.code;
    }
    if (!code) return res.status(400).json({ success: false });
    await lobbyService.cancelSession(code);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/verify/:code', async (req, res) => {
    try {
        const lobby = await lobbyService.getSessionByCode(req.params.code);
        
        if (!lobby) {
            return res.status(404).json({ success: false, message: "الكود غير صحيح أو انتهت الجلسة" });
        }

        res.json({ 
            success: true, 
            gameId: lobby.gameId._id, 
            gameType: lobby.gameId.gameType,
            joinCode: lobby.joinCode,
            teamNameA: lobby.teamNameA || 'أ',
            teamNameB: lobby.teamNameB || 'ب',
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "خطأ في الخادم" });
    }
});

module.exports = router;
