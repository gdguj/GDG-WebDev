const express = require("express");
const controller = require("../controllers/gameSession.controller");

const router = express.Router();

// Required API contract
router.post("/session/create", controller.createGameSession);
router.post("/session/join", controller.joinGameByCode);
router.post("/session/start", controller.startGame);
router.post("/session/ready", controller.setReady);
router.post("/game/answer", controller.submitAnswer);
router.post("/session/finish", controller.finishGame);
router.get("/leaderboard", controller.getLeaderboard);
router.get("/games/templates", controller.getTemplateGames);
router.get("/games/user", controller.getUserGames);
router.get("/session/:sessionId", controller.getSession);

// Backward-compatible routes
router.post("/sessions", controller.createGameSession);
router.post("/sessions/join", controller.joinGameByCode);
router.patch("/sessions/:sessionId/start", controller.startGame);
router.post("/sessions/:sessionId/answer", controller.submitAnswer);
router.patch("/sessions/:sessionId/finish", controller.finishGame);

module.exports = router;
