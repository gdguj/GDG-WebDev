const express = require("express");
const multer = require("multer");

const controller = require("../controllers/upload.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (String(file.mimetype || "").startsWith("image/")) {
      cb(null, true);
      return;
    }

    const error = new Error("الملف المرفوع يجب أن يكون صورة.");
    error.statusCode = 400;
    cb(error);
  },
});

router.post("/image", requireAuth, upload.single("image"), controller.uploadImage);

module.exports = router;
