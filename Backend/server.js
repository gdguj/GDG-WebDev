require("dotenv").config(); 

const express = require("express");
const path = require("path");
const app = require("./src/app");

const PORT = process.env.PORT || 5000;

// ================================
// تقديم الملفات الثابتة (Frontend)
// ================================
const frontendPath = path.join(__dirname, "../HTML");
const cssPath = path.join(__dirname, "../CSS");
const jsPath = path.join(__dirname, "../JS");
const imagesPath = path.join(__dirname, "../Images");

app.use(express.static(frontendPath));   // HTML files
app.use(express.static(cssPath));         // CSS files
app.use(express.static(jsPath));          // JS files
app.use(express.static(imagesPath));      // Images
app.use("/Data", express.static("Data"));
// ================================
// تحديد الصفحة الافتراضية
// ================================
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "main page.html"));
});

// ================================
// بدء السيرفر
// ================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📄 Frontend served from: ${frontendPath}`);
  console.log(`🎮 Survey Game: http://localhost:${PORT}/survey-game.html`);
  console.log(`🖼️  Image Game: http://localhost:${PORT}/imageGame.html`);
});