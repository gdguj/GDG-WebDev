const express = require("express");
const {
  startFamilyFeudRound,
  getRoundState,
  submitAnswer,
  updateCurrentTeam
} = require("../controllers/ai.controller");

const router = express.Router();

router.post("/family-feud/start-round", startFamilyFeudRound);
router.get("/family-feud/round-state", getRoundState);
router.post("/family-feud/submit-answer", submitAnswer);
router.put("/family-feud/update-team", updateCurrentTeam);

module.exports = router;