const express = require('express');
const router = express.Router();
const lobbyController = require('../controllers/lobby.controller');
const lobbyService = require('../services/lobby.service');


router.post('/create', lobbyController.createLobby);
router.get('/verify/:code', async (req, res) => {
    try {
        const lobby = await lobbyService.getSessionByCode(req.params.code);
        
        if (!lobby) {
            return res.status(404).json({ success: false, message: "الكود غير صحيح أو انتهت الجلسة" });
        }

        // نرجع البيانات اللي يحتاجها الفرونت اند للتوجيه
        res.json({ 
            success: true, 
            gameId: lobby.gameId._id, 
            gameType: lobby.gameId.gameType,
            joinCode: lobby.joinCode
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "خطأ في الخادم" });
    }
});

module.exports = router;