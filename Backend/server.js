require("dotenv").config();

const mongoose = require("mongoose");
const express = require("express");
const path = require("path");

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

const frontendPath = path.join(__dirname, "../HTML");
const cssPath = path.join(__dirname, "../CSS");
const jsPath = path.join(__dirname, "../JS");
const imagesPath = path.join(__dirname, "../Images");

app.use(express.static(frontendPath));
app.use("/CSS", express.static(cssPath));
app.use("/JS", express.static(jsPath));
app.use("/Images", express.static(imagesPath));
app.use("/Data", express.static("Data"));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "main page.html"));
});

app.get("/survey-game.html", (req, res) => {
  res.sendFile(path.join(frontendPath, "survey-game.html"));
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
  });

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📄 Frontend served from: ${frontendPath}`);
  console.log(`🎮 Survey Game: http://localhost:${PORT}/survey-game.html`);
});