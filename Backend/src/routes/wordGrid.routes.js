const express = require("express");
const router = express.Router();
const controller = require("../controllers/wordGrid.controller");

// router.post("/session", controller.createSession);
router.post("/answer", controller.submitAnswer);
router.post("/init-game", controller.initGame);

module.exports = router;