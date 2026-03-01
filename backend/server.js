// backend/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const TURN_SECONDS = Number(process.env.TURN_SECONDS || 30);

/* ---------------------------
   Mongo Connection
--------------------------- */
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI missing in .env");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
}

/* ---------------------------
   Schemas
--------------------------- */
const CellSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },        // "A1" ...
    letter: { type: String, required: true },    // "H"
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    claimedBy: { type: String, default: "" },    // "green" | "blue" | ""
    status: { type: String, default: "empty" },  // empty | correct | wrong
    lastAnswer: { type: String, default: "" }
  },
  { _id: false }
);

const SessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, unique: true, index: true },
    difficulty: { type: String, default: "standard" }, // easy | standard | hard
    status: { type: String, default: "active" },       // active | finished

    nowPlaying: { type: String, default: "green" },    // green | blue
    turnEndsAt: { type: Date, required: true },

    teams: {
      green: { name: String, score: Number, words: Number },
      blue: { name: String, score: Number, words: Number }
    },

    cells: [CellSchema],

    winner: { type: String, default: "" }, // green | blue | draw | ""
    stats: {
      totalWords: { type: Number, default: 0 },
      lastMoveAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", SessionSchema);

/* ---------------------------
   Helpers
--------------------------- */
function startsWithLetter(answer, letter) {
  return String(answer || "").trim().toLowerCase().startsWith(String(letter || "").toLowerCase());
}

function getGridSize(difficulty) {
  // ✅ easy أقل، standard وسط، hard أكبر
  if (difficulty === "easy") return { rows: 4, cols: 3 };      // 12
  if (difficulty === "hard") return { rows: 7, cols: 6 };      // 42
  return { rows: 5, cols: 4 };                                 // 20 (standard)
}

function generateCells(rows, cols) {
  // labels A..Z then 1.. if more
  const labels = [];
  for (let i = 0; i < 26; i++) labels.push(String.fromCharCode(65 + i));
  const remaining = rows * cols - 26;
  for (let i = 1; i <= remaining; i++) labels.push(String(i));

  // letters: نعطي كل خلية حرف "مطلوب تبدأ فيه الإجابة"
  // هنا نخليه من A-Z بشكل دائري
  const letters = [];
  for (let i = 0; i < rows * cols; i++) {
    letters.push(String.fromCharCode(65 + (i % 26)));
  }

  const cells = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `R${r}C${c}`;      // ID ثابت
      const letter = letters[idx];
      cells.push({
        id,
        letter,
        row: r,
        col: c,
        claimedBy: "",
        status: "empty",
        lastAnswer: ""
      });
      idx++;
    }
  }
  return cells;
}

/**
 * Hex neighbors using "odd-r" offset coordinates (rows are offset)
 * Like your canvas grid (odd rows shifted)
 */
function getNeighbors(row, col) {
  const isOdd = row % 2 === 1;
  const dirsEven = [
    [-1, -1], [-1, 0],
    [0, -1], [0, 1],
    [1, -1], [1, 0]
  ];
  const dirsOdd = [
    [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, 0], [1, 1]
  ];
  const dirs = isOdd ? dirsOdd : dirsEven;
  return dirs.map(([dr, dc]) => [row + dr, col + dc]);
}

function checkConnectedPath(cells, rows, cols, team) {
  // ✅ نفترض الفوز: اتصال من اليسار إلى اليمين (زي Hex)
  // green: left->right, blue: top->bottom (ممكن تبديل، بس هذا منطقي)
  const key = (r, c) => `${r},${c}`;
  const owned = new Set(
    cells.filter(x => x.claimedBy === team && x.status === "correct").map(x => key(x.row, x.col))
  );

  const queue = [];
  const visited = new Set();

  const pushIfOwned = (r, c) => {
    const k = key(r, c);
    if (owned.has(k) && !visited.has(k)) {
      visited.add(k);
      queue.push([r, c]);
    }
  };

  if (team === "green") {
    // start: left edge col=0
    for (let r = 0; r < rows; r++) pushIfOwned(r, 0);

    while (queue.length) {
      const [r, c] = queue.shift();
      if (c === cols - 1) return true; // reached right edge

      for (const [nr, nc] of getNeighbors(r, c)) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        pushIfOwned(nr, nc);
      }
    }
  } else {
    // blue: top->bottom
    for (let c = 0; c < cols; c++) pushIfOwned(0, c);

    while (queue.length) {
      const [r, c] = queue.shift();
      if (r === rows - 1) return true; // reached bottom edge

      for (const [nr, nc] of getNeighbors(r, c)) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        pushIfOwned(nr, nc);
      }
    }
  }

  return false;
}

function ensureTurnValid(session, team) {
  if (session.status !== "active") return { ok: false, msg: "Game is finished" };
  if (!["green", "blue"].includes(team)) return { ok: false, msg: "Invalid team" };
  if (session.nowPlaying !== team) return { ok: false, msg: "Not your turn" };

  const now = new Date();
  if (now > session.turnEndsAt) return { ok: false, msg: "Turn time ended" };

  return { ok: true };
}

function switchTurn(session) {
  session.nowPlaying = session.nowPlaying === "green" ? "blue" : "green";
  session.turnEndsAt = new Date(Date.now() + TURN_SECONDS * 1000);
}

/* =========================================================
   0) Health
========================================================= */
app.get("/health", (req, res) => res.json({ ok: true }));

/* =========================================================
   1) POST /word-grid/session
   create a new game session and load the grid questions
========================================================= */
app.post("/word-grid/session", async (req, res) => {
  try {
    const difficulty = (req.body.difficulty || "standard").toLowerCase();
    const { rows, cols } = getGridSize(difficulty);

    const sessionId = nanoid(8);
    const session = await Session.create({
      sessionId,
      difficulty,
      status: "active",
      nowPlaying: "green",
      turnEndsAt: new Date(Date.now() + TURN_SECONDS * 1000),

      teams: {
        green: { name: req.body.greenName || "Green Team", score: 0, words: 0 },
        blue: { name: req.body.blueName || "Blue Team", score: 0, words: 0 }
      },

      cells: generateCells(rows, cols),

      stats: { totalWords: 0, lastMoveAt: null }
    });

    res.json(session);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create session" });
  }
});

/* (مفيد للفرونت) GET session */
app.get("/word-grid/session/:sessionId", async (req, res) => {
  const session = await Session.findOne({ sessionId: req.params.sessionId });
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

/* =========================================================
   2) POST /word-grid/answer
   receive answer, check starts with correct letter, mark cell
========================================================= */
app.post("/word-grid/answer", async (req, res) => {
  try {
    const { sessionId, cellId, team, answer } = req.body;

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const turn = ensureTurnValid(session, team);
    if (!turn.ok) return res.status(400).json({ error: turn.msg, nowPlaying: session.nowPlaying, turnEndsAt: session.turnEndsAt });

    const cell = session.cells.find(c => c.id === cellId);
    if (!cell) return res.status(404).json({ error: "Cell not found" });

    if (cell.claimedBy) return res.status(400).json({ error: "Cell already claimed" });

    const correct = startsWithLetter(answer, cell.letter);

    if (correct) {
      cell.status = "correct";
      cell.claimedBy = team;
      cell.lastAnswer = String(answer || "");

      session.teams[team].score += 4;
      session.teams[team].words += 1;
      session.stats.totalWords += 1;
    } else {
      cell.status = "wrong";
      cell.lastAnswer = String(answer || "");
      // (اختياري) نخليها wrong بدون claim
    }

    session.stats.lastMoveAt = new Date();

    // بعد الإجابة نبدّل الدور مباشرة
    switchTurn(session);

    await session.save();

    res.json({
      correct,
      nowPlaying: session.nowPlaying,
      turnEndsAt: session.turnEndsAt,
      cell,
      teams: session.teams
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

/* =========================================================
   3) PATCH /word-grid/score
   update team score (if frontend needs separate call)
========================================================= */
app.patch("/word-grid/score", async (req, res) => {
  try {
    const { sessionId, team, points = 0, words = 0 } = req.body;

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (!["green", "blue"].includes(team)) return res.status(400).json({ error: "Invalid team" });

    session.teams[team].score += Number(points) || 0;
    session.teams[team].words += Number(words) || 0;

    await session.save();

    res.json({
      team,
      newScore: session.teams[team].score,
      newWords: session.teams[team].words
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update score" });
  }
});

/* =========================================================
   4) PATCH /word-grid/finish
   end game, check connected path, save winner + stats
========================================================= */
app.patch("/word-grid/finish", async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.status = "finished";

    const { rows, cols } = getGridSize(session.difficulty);

    const greenPath = checkConnectedPath(session.cells, rows, cols, "green");
    const bluePath  = checkConnectedPath(session.cells, rows, cols, "blue");

    let winner = "draw";

    // لو أحد سوا path يفوز حتى لو نقاطه أقل (حسب متطلبات Hex)
    if (greenPath && !bluePath) winner = "green";
    else if (bluePath && !greenPath) winner = "blue";
    else {
      // إذا ما في path أو الاثنين سوا path (نادر) نرجع للنقاط
      const g = session.teams.green.score;
      const b = session.teams.blue.score;
      if (g > b) winner = "green";
      else if (b > g) winner = "blue";
      else winner = "draw";
    }

    session.winner = winner;
    await session.save();

    res.json({
      winner,
      connectedPath: { green: greenPath, blue: bluePath },
      finalScores: session.teams,
      stats: session.stats
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to finish game" });
  }
});

/* ---------------------------
   Start
--------------------------- */
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connect error:", err.message);
    process.exit(1);
  });