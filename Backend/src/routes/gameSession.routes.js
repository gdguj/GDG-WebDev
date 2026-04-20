const express = require("express");
const controller = require("../controllers/gameSession.controller");

const router = express.Router();

router.post("/sessions", controller.createGameSession);
router.post("/sessions/join", controller.joinGameByCode);
router.patch("/sessions/:sessionId/start", controller.startGame);
router.post("/sessions/:sessionId/answer", controller.submitAnswer);
router.patch("/sessions/:sessionId/finish", controller.finishGame);
router.get("/leaderboard", controller.getLeaderboard);

module.exports = router;
