/**
 * ════════════════════════════════════════════════════════════════════════════════
 * FAMILY FEUD GAME - PROPER GAME LOGIC
 * ════════════════════════════════════════════════════════════════════════════════
 * 
 * Game Rules:
 * - Two teams: Team 1 (أ) and Team 2 (ب)
 * - One question per round with exactly 10 answers
 * - Team 1 starts answering
 * - If Team 1 gives 3 wrong answers, they're done → Team 2 attempts to STEAL
 * - Team 2 continues answering the SAME question (no new question generated)
 * - If Team 2 guesses a correct answer during steal, they take ALL remaining points
 * - Round ends when: all answers revealed OR one team steals the points
 * - NEW question only when explicitly starting a new round
 */

// ════════════════════════════════════════════════════════════════════════════════
// GAME STATE VARIABLES
// ════════════════════════════════════════════════════════════════════════════════

let gameState = {
  question: null,
  answers: [], // [{answer, points, revealed}]
  currentTeam: "team1", // team1 or team2
  wrongAttempts: 0, // 0-3
  roundScore: 0, // accumulated points in current round
  isStealMode: false, // true when team2 is attempting to steal
  originalTeam: null // which team started (team1 usually)
};

let roundCounter = 0;
const maxRounds = 2;
let gameOver = false;

let teamScores = {
  team1: 0,
  team2: 0
};

const API_BASE = "http://localhost:5000/api/ai";

// ════════════════════════════════════════════════════════════════════════════════
// DOM ELEMENTS
// ════════════════════════════════════════════════════════════════════════════════

const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const strikesEl = document.getElementById("strikes");
const inputEl = document.getElementById("answerInput");
const scoreAEl = document.getElementById("scoreA");
const scoreBEl = document.getElementById("scoreB");
const timerEl = document.getElementById("timer");
const currentTeamBox = document.getElementById("currentTeamBox");
const roundScoreEl = document.getElementById("roundScore");

// ════════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════════

let roundActive = false; // used by timer to pause when round over

/**
 * Start a completely new round with a fresh question
 */
async function startNewRound() {
  if (gameOver) return;
  // hide start button if visible
  const btn = document.getElementById("startRoundBtn");
  if (btn) btn.style.display = "none";

  inputEl.disabled = false;

  try {
    console.log("🔄 Starting new round...");
    
    // Reset all round-specific state
    gameState.roundScore = 0;
    gameState.wrongAttempts = 0;
    gameState.isStealMode = false;
    gameState.originalTeam = null;
    gameState.currentTeam = "team1";
    
    // Show loading
    questionEl.textContent = "جاري تحميل السؤال...";
    inputEl.value = "";
    strikesEl.textContent = "";
    answersEl.innerHTML = "";
    
    // reset timer
    timeLeft = 45;
    timerEl.textContent = timeLeft;
    
    // Fetch new round from backend
    const response = await fetch(`${API_BASE}/family-feud/start-round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Load round data
    gameState.question = data.round.question;
    gameState.answers = data.round.answers;
    
    console.log("✅ New round loaded:", gameState);
    
    // Update UI
    updateUI();
    inputEl.focus();
    
    // Enable timer for this round
    roundActive = true;
    
  } catch (error) {
    console.error("❌ Error starting new round:", error);
    questionEl.textContent = "خطأ في تحميل السؤال - تأكد من البيئة";
  }
}

/**
 * Load initial round when page loads
 */
window.addEventListener("load", startNewRound);

// ════════════════════════════════════════════════════════════════════════════════
// UI UPDATES
// ════════════════════════════════════════════════════════════════════════════════

const roundTitleEl = document.querySelector(".round-title");

/**
 * Update all UI elements to reflect current game state
 */
function updateUI() {
  // Update round title
  roundTitleEl.textContent = `الجولة ${roundCounter + 1}`;
  
  // Update question
  questionEl.textContent = gameState.question || "جاري تحميل السؤال...";
  
  // Update scores
  scoreAEl.textContent = teamScores.team1;
  scoreBEl.textContent = teamScores.team2;
  roundScoreEl.textContent = gameState.roundScore;
  
  // Update team indicator
  const teamName = gameState.currentTeam === "team1" ? "الفريق أ" : "الفريق ب";
  if (gameState.isStealMode) {
    currentTeamBox.textContent = `${teamName} (محاولة سرقة!)`;
  } else {
    currentTeamBox.textContent = teamName;
  }
  
  // Update strikes
  strikesEl.textContent = "❌".repeat(gameState.wrongAttempts);
  
  // Render answer cards
  renderAnswers();
}

/**
 * Render answer cards with revealed/hidden state
 */
function renderAnswers() {
  answersEl.innerHTML = "";
  
  gameState.answers.forEach(ans => {
    const div = document.createElement("div");
    div.classList.add("answer-card");
    
    if (ans.revealed) {
      div.classList.add("revealed");
      
      const pointsEl = document.createElement("div");
      pointsEl.classList.add("points");
      pointsEl.textContent = ans.points;
      
      const textEl = document.createElement("div");
      textEl.classList.add("text");
      textEl.textContent = ans.answer;
      
      div.appendChild(pointsEl);
      div.appendChild(textEl);
    }
    
    answersEl.appendChild(div);
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// ANSWER SUBMISSION LOGIC
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Normalize Arabic text for comparison
 */
function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "") // Remove diacritics
    .replace(/[هة]/g, "ه")                       // treat taa marbuta same as ha
    .replace(/[^\u0600-\u06FF0-9\s]/g, "") // Remove non-Arabic
    .replace(/\s+/g, " ") // Collapse whitespace
    .replace(/^ال\s?/, "") // Remove "ال" prefix
    .trim();
}

/**
 * Submit user's answer
 */
async function submitAnswer() {
  if (gameOver) return;
  const userInput = inputEl.value.trim();
  
  if (!userInput) {
    return;
  }
  
  try {
    console.log("📤 Submitting answer:", userInput);
    
    const response = await fetch(`${API_BASE}/family-feud/submit-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: userInput })
    });
    
    if (!response.ok) {
      let errText;
      try { errText = await response.text(); } catch {};
      throw new Error(`Server error: ${response.status} ${errText||""}`);
    }
    
    let result;
    try {
      result = await response.json();
    } catch (e) {
      throw new Error("Invalid JSON from server");
    }
    console.log("📥 Server response:", result);
    
    if (result.correct) {
      // ───── CORRECT ANSWER ─────
      handleCorrectAnswer(result);
    } else if (result.stealFailed) {
      handleStealFailure(result);
    } else {
      // ───── WRONG ANSWER ─────
      handleWrongAnswer(result);
    }
    
    // Clear input
    inputEl.value = "";
    inputEl.focus();
    
  } catch (error) {
    console.error("❌ Error submitting answer:", error);
    // if B was stealing, treat as failed steal
    if (gameState.isStealMode && gameState.currentTeam !== gameState.originalTeam) {
      handleStealFailure({ originalTeam: gameState.originalTeam, roundScore: gameState.roundScore });
    } else {
      // normal error popup only for non-steal scenarios
      showResultPopup("⚠️ خطأ", "حدث خطأ - يرجى المحاولة مرة أخرى");
    }
    // ensure input disabled to prevent repeat
    inputEl.disabled = true;
  }
}

/**
 * Handle correct answer submission
 */
function handleCorrectAnswer(result) {
  // Update local state with latest from server
  gameState.roundScore = result.roundScore;
  
  // Mark the revealed answer in our local state
  const revealedAns = gameState.answers.find(
    a => normalize(a.answer) === normalize(result.answer) && !a.revealed
  );
  if (revealedAns) {
    revealedAns.revealed = true;
  }
  
  // Mark ALL other unrevealed as revealed (in steal scenario)
  if (gameState.isStealMode && gameState.currentTeam !== gameState.originalTeam) {
    gameState.answers.forEach(a => a.revealed = true);
  }
  
  console.log("✅ Correct answer! Round Score:", gameState.roundScore);
  updateUI();
  
  // Check if round should end
  const allRevealed = gameState.answers.every(a => a.revealed);
  if (allRevealed) {
    handleRoundEnd("انتهت الجولة - تم كشف جميع الإجابات");
  } else if (gameState.isStealMode && gameState.currentTeam !== gameState.originalTeam) {
    handleStealSuccess();
  }
}

/**
 * Handle wrong answer submission
 */
function handleWrongAnswer(result) {
  gameState.wrongAttempts = result.wrongAttempts;
  
  console.log(`❌ Wrong answer! Attempts: ${gameState.wrongAttempts}/3`);
  updateUI();
  
  // Check if steal mode should activate
  if (result.stealModeActivated && !gameState.isStealMode) {
    gameState.isStealMode = true;
    gameState.originalTeam = gameState.currentTeam;
    gameState.currentTeam = gameState.currentTeam === "team1" ? "team2" : "team1";
    gameState.wrongAttempts = 0;
    
    // give stealing team a fresh timer
    timeLeft = 45;
    timerEl.textContent = timeLeft;
    
    console.log("🔄 Steal mode activated! Switching to:", gameState.currentTeam);
    
    const teamA = gameState.originalTeam === "team1" ? "أ" : "ب";
    const teamB = gameState.currentTeam === "team1" ? "أ" : "ب";
    const msg = `انتهى دور الفريق ${teamA}! الآن دور الفريق ${teamB} (محاولة سرقة). الزمن أعيد إلى 45 ثانية.`;
    
    showResultPopup("📢 تنبيه", msg);
    updateUI();
  }
}

/**
 * Handle successful steal
 */
function handleStealSuccess() {
  const points = gameState.roundScore;
  const teamKey = gameState.currentTeam;
  
  console.log(`🎉 Steal successful! Team ${teamKey === "team1" ? "أ" : "ب"} scores:`, points);
  updateUI();
  
  const teamName = gameState.currentTeam === "team1" ? "الفريق أ" : "الفريق ب";
  showResultPopup(
    "🎉 تمت السرقة بنجاح!",
    `${teamName} حصل على ${points} نقطة`
  );
  
  setTimeout(() => {
    closeResultPopup();
    handleRoundEnd(`${teamName} سرق النقاط`, teamKey);
  }, 2000);
}

function handleStealFailure(result) {
  // stealing team failed, original team keeps roundScore
  const originalKey = result.originalTeam;
  const teamName = originalKey === "team1" ? "الفريق أ" : "الفريق ب";

  console.log(`❌ Steal failed, ${teamName} keeps ${result.roundScore} points`);
  
  // go straight to round end with message (no separate popup here to avoid double popup)
  handleRoundEnd(`❌ فشلت السرقة - ${teamName} يحتفظ بالنقاط`, originalKey);
}

/**
 * Handle round end (all answers revealed)
 */
function handleRoundEnd(message, winnerTeamKey) {
  // increment rounds completed
  roundCounter++;

  // reveal all answers on board
  gameState.answers.forEach(a => a.revealed = true);
  updateUI();

  const points = gameState.roundScore;
  const teamKey = winnerTeamKey || gameState.currentTeam;
  
  teamScores[teamKey] += points;
  
  console.log(`🏁 Round ${roundCounter} ended! Team ${teamKey === "team1" ? "أ" : "ب"} scores:`, points);
  
  showResultPopup("🏁 انتهت الجولة", message || "لا توجد إجابات متبقية");

  // disable input to prevent further guesses
  inputEl.disabled = true;
  roundActive = false; // stop timer

  if (roundCounter >= maxRounds) {
    setTimeout(() => {
      closeResultPopup();
      finishGame();
    }, 2000);
  } else {
    // show start button instead of auto starting
    document.getElementById("startRoundBtn").style.display = "inline-block";
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// POPUP MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════════

function finishGame() {
  gameOver = true;
  const btn = document.getElementById("startRoundBtn");
  if (btn) btn.style.display = "none";
  const winner = teamScores.team1 > teamScores.team2 ? "الفريق أ" :
                 teamScores.team2 > teamScores.team1 ? "الفريق ب" : "تعادل";
  const message = winner === "تعادل"
    ? "انتهت اللعبة بتعادل!"
    : `الفائز هو ${winner}`;
  
  showResultPopup("🎮 انتهت اللعبة", message);
  
  // Reset game after showing winner
  setTimeout(() => {
    closeResultPopup();
    roundCounter = 0;
    teamScores.team1 = 0;
    teamScores.team2 = 0;
    gameOver = false;
    startNewRound();
  }, 4000);
}

function showResultPopup(title, message) {
  document.getElementById("resultTitle").textContent = title;
  document.getElementById("resultMessage").textContent = message;
  document.getElementById("resultPopup").style.display = "flex";
}

function closeResultPopup() {
  document.getElementById("resultPopup").style.display = "none";
}

// ════════════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ════════════════════════════════════════════════════════════════════════════════

// Submit answer on button click
document.querySelector(".input-section button").addEventListener("click", submitAnswer);

// Submit answer on Enter key
inputEl.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    submitAnswer();
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// TIMER (Keep 45-second rounds, resets for each question)
// ════════════════════════════════════════════════════════════════════════════════

let timeLeft = 45;

setInterval(() => {
  if (!roundActive) return; // stop when round has ended
  timeLeft--;
  timerEl.textContent = timeLeft;
  
  if (timeLeft <= 0) {
    // Time's up for this round
    roundActive = false; // stop timer immediately to prevent duplicate triggers
    
    // If not in steal mode, activate steal mode
    if (!gameState.isStealMode) {
      const msg = "⏰ انتهى الوقت! نهاية دور الفريق";
      showResultPopup("⏰ انتهى الوقت!", msg);
      
      gameState.isStealMode = true;
      gameState.originalTeam = gameState.currentTeam;
      gameState.currentTeam = gameState.currentTeam === "team1" ? "team2" : "team1";
      gameState.wrongAttempts = 0;
      
      setTimeout(() => {
        closeResultPopup();
        updateUI();
      }, 1500);
    } else {
      // Steal attempt timed out – treat as failed steal (handleRoundEnd will show popup)
      const originalKey = gameState.originalTeam;
      handleStealFailure({ originalTeam: originalKey, roundScore: gameState.roundScore });
    }
  }
}, 1000);
