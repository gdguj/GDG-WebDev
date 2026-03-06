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
const dataPath = path.join(__dirname, "Data");

app.use(express.static(frontendPath));   // HTML files
app.use(express.static(cssPath));         // CSS files
app.use(express.static(jsPath));          // JS files
app.use(express.static(imagesPath));      // Images

// Also expose assets under explicit folder prefixes used by HTML pages.
app.use("/CSS", express.static(cssPath));
app.use("/JS", express.static(jsPath));
app.use("/Images", express.static(imagesPath));
app.use("/Data", express.static(dataPath));
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
  console.log(`🎮 Survey Game: http://localhost:${PORT}/survey-game.html`);
  console.log(`🖼️  Image Game: http://localhost:${PORT}/imageGame.html`);
});