const express = require("express");
const {
  getFamilyFeud,
  startFamilyFeudRound,
  getRoundState,
  submitAnswer,
  updateCurrentTeam
} = require("../controllers/ai.controller");

const router = express.Router();

// Legacy endpoint - returns a simple question
router.get("/family-feud", getFamilyFeud);

// New Family Feud Game Logic Endpoints
// ────────────────────────────────────────────────────────────────────────────────

// POST - Start a new round with a fresh question
router.post("/family-feud/start-round", startFamilyFeudRound);

// GET - Get current round state
router.get("/family-feud/round-state", getRoundState);

// POST - Submit an answer and update game state
router.post("/family-feud/submit-answer", submitAnswer);

// PUT - Update current team (switch turns)
router.put("/family-feud/update-team", updateCurrentTeam);

module.exports = router;