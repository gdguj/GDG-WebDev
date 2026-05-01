const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const controller = require("../controllers/score.controller");

const router = express.Router();

router.post("/record", requireAuth, controller.recordMyScore);

module.exports = router;
