const express = require("express");
const controller = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/google", controller.googleLogin);
router.get("/google-config", controller.googleConfig);
router.get("/me", requireAuth, controller.me);

module.exports = router;
