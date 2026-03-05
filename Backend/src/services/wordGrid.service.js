const Session = require("../models/Session.model");

function startsWithLetter(answer, letter) {
  return String(answer || "").trim().toLowerCase()
    .startsWith(String(letter || "").toLowerCase());
}

function getGridSize(difficulty) {
  if (difficulty === "easy") return { rows: 4, cols: 3 };
  if (difficulty === "hard") return { rows: 7, cols: 6 };
  return { rows: 5, cols: 4 };
}

function generateCells(rows, cols) {
  const cells = [];
  let idx = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        id: `R${r}C${c}`,
        letter: String.fromCharCode(65 + (idx % 26)),
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

exports.createSession = async (difficulty, greenName, blueName, TURN_SECONDS) => {
  const { nanoid } = await import("nanoid");
  const { rows, cols } = getGridSize(difficulty);
  return await Session.create({
    sessionId: nanoid(8),
    difficulty,
    status: "active",
    nowPlaying: "green",
    turnEndsAt: new Date(Date.now() + TURN_SECONDS * 1000),
    teams: {
      green: { name: greenName || "Green Team", score: 0, words: 0 },
      blue: { name: blueName || "Blue Team", score: 0, words: 0 }
    },
    cells: generateCells(rows, cols),
    stats: { totalWords: 0, lastMoveAt: null }
  });
};

exports.submitAnswer = async (sessionId, cellId, team, answer) => {
  const session = await Session.findOne({ sessionId });
  if (!session) throw new Error("Session not found");

  const cell = session.cells.find(c => c.id === cellId);
  if (!cell) throw new Error("Cell not found");

  const correct = startsWithLetter(answer, cell.letter);

  if (correct) {
    cell.status = "correct";
    cell.claimedBy = team;
    session.teams[team].score += 4;
    session.teams[team].words += 1;
    session.stats.totalWords += 1;
  } else {
    cell.status = "wrong";
  }

  session.nowPlaying = team === "green" ? "blue" : "green";
  await session.save();

  return { correct, session };
};