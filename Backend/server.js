require("dotenv").config(); 

const express = require("express");
const http = require("http");
const mongoose = require('mongoose');
const path = require("path");
const app = require("./src/app");
const { initSocket, emitSessionEvent } = require("./src/realtime/socket");
const gameSessionService = require("./src/services/gameSession.service");

const PORT = process.env.PORT || 5000;
const ALLOWED_COLLECTIONS = new Set([
  "gameTemplates",
  "gamelobbies",
  "scores",
  "userGames",
]);

mongoose.set("autoCreate", false);
mongoose.set("autoIndex", false);

function getVisibleCollectionNames(collections) {
  return collections
    .map((entry) => String(entry.name || ""))
    .filter((name) => name && !name.startsWith("system."));
}

function enforceModelCollectionPolicy() {
  const modelNames = mongoose.modelNames();
  const disallowedModels = [];

  modelNames.forEach((modelName) => {
    const model = mongoose.model(modelName);
    const collectionName = String(
      (model && model.collection && model.collection.collectionName) || ""
    );

    if (collectionName && !ALLOWED_COLLECTIONS.has(collectionName)) {
      disallowedModels.push(`${modelName}->${collectionName}`);
    }
  });

  if (disallowedModels.length) {
    throw new Error(
      `Disallowed model-collection bindings: ${disallowedModels.join(", ")}`
    );
  }
}

async function enforceCollectionPolicy() {
  enforceModelCollectionPolicy();

  const collections = await mongoose.connection.db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const existing = getVisibleCollectionNames(collections);
  const existingSet = new Set(existing);

  const disallowed = existing.filter((name) => !ALLOWED_COLLECTIONS.has(name));
  const missing = Array.from(ALLOWED_COLLECTIONS).filter((name) => !existingSet.has(name));

  if (disallowed.length || missing.length) {
    const details = [
      disallowed.length
        ? `Collections not allowed: ${disallowed.join(", ")}`
        : null,
      missing.length
        ? `Collections missing (must exist manually): ${missing.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join(" | ");

    throw new Error(`Mongo collection policy violation. ${details}`);
  }

  console.log(
    `✅ Mongo collection policy enforced: ${Array.from(ALLOWED_COLLECTIONS).join(", "
    )}`
  );
}

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


app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

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
const server = http.createServer(app);

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    await enforceCollectionPolicy();

    initSocket(server);
    gameSessionService.setRealtimeEmitter(emitSessionEvent);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🎮 Survey Game: http://localhost:${PORT}/survey-game.html`);
      console.log(`🖼️  Image Game: http://localhost:${PORT}/imageGame.html`);
      console.log(`Letter Cell Game: http://localhost:${PORT}/LettercellGameLanding.html`);
    });
  } catch (err) {
    console.error("❌ Server startup blocked:", err.message || err);
    process.exit(1);
  }
}

startServer();