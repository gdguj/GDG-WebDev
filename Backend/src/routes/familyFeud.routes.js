const express = require("express");
const {
  createSession,
  getSession,
  finishGame
} = require("../controllers/familyFeud.controller");

const router = express.Router();

router.post("/session", createSession);
router.get("/session/:id", getSession);
router.post("/session/:id/finish", finishGame);

module.exports = router;