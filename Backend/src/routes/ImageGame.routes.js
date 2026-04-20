const express = require("express");
const router = express.Router();
const controller = require("../controllers/ImageGame.controller");

router.post("/create", controller.createGame);
router.get("/:sessionId", controller.getGame);
router.post("/:sessionId/answer", controller.submitAnswer);
router.patch("/:sessionId/end", controller.endGame);

module.exports = router;