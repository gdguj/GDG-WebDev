const express = require("express");
const {
  getFamilyFeud,
  startFamilyFeudRound,
  getRoundState,
  submitAnswer,
  updateCurrentTeam,
} = require("../controllers/familyFeud.controller");

const router = express.Router();

router.get("/", getFamilyFeud);
router.post("/start-round", startFamilyFeudRound);
router.get("/round-state", getRoundState);
router.post("/submit-answer", submitAnswer);
router.put("/update-team", updateCurrentTeam);

module.exports = router;
