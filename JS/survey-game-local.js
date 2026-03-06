// ===============================
//  Family Feud – JSON Version
//  (Same logic as original AI version)
// ===============================

// -------------------------------
// GAME STATE
// -------------------------------
let gameState = {
  question: null,
  answers: [],
  currentTeam: "team1",
  wrongAttempts: 0,
  roundScore: 0,
  isStealMode: false,
  originalTeam: null
};

let roundCounter = 0;
const maxRounds = 2; // جولتين فقط
let gameOver = false;

let teamScores = {
  team1: 0,
  team2: 0
};

// -------------------------------
// DOM ELEMENTS
// -------------------------------
const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const strikesEl = document.getElementById("strikes");
const inputEl = document.getElementById("answerInput");
const scoreAEl = document.getElementById("scoreA");
const scoreBEl = document.getElementById("scoreB");
const timerEl = document.getElementById("timer");
const currentTeamBox = document.getElementById("currentTeamBox");
const roundScoreEl = document.getElementById("roundScore");
const roundTitleEl = document.querySelector(".round-title");

// -------------------------------
// JSON QUESTIONS
// -------------------------------
let questionsData = [];
let remainingQuestionIndexes = [];

// تحميل الأسئلة من JSON
async function loadQuestions() {
  const res = await fetch("/Data/family_feud_questions.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load questions JSON: ${res.status}`);
  }

  questionsData = await res.json();
  if (!Array.isArray(questionsData) || questionsData.length === 0) {
    throw new Error("Questions JSON is empty or invalid.");
  }

  // Keep a rotating pool so rounds do not repeat questions until all are used.
  remainingQuestionIndexes = questionsData.map((_, index) => index);
}

// اختيار سؤال عشوائي
function getRandomQuestion() {
  if (remainingQuestionIndexes.length === 0) {
    remainingQuestionIndexes = questionsData.map((_, index) => index);
  }

  const pickPosition = Math.floor(Math.random() * remainingQuestionIndexes.length);
  const [pickedIndex] = remainingQuestionIndexes.splice(pickPosition, 1);
  return questionsData[pickedIndex];
}

// -------------------------------
// START NEW ROUND
// -------------------------------
async function startNewRound() {
  if (gameOver) return;

  const btn = document.getElementById("startRoundBtn");
  if (btn) btn.style.display = "none";

  inputEl.disabled = false;

  if (questionsData.length === 0) {
    await loadQuestions();
  }

  console.log("🔄 Starting new round...");

  // Reset round state
  gameState.roundScore = 0;
  gameState.wrongAttempts = 0;
  gameState.isStealMode = false;
  gameState.originalTeam = null;

  // Alternate starting team
  gameState.currentTeam = (roundCounter % 2 === 0 ? "team1" : "team2");

  // UI reset
  questionEl.textContent = "جاري تحميل السؤال...";
  inputEl.value = "";
  strikesEl.textContent = "";
  answersEl.innerHTML = "";

  // Timer reset
  timeLeft = 180;
  timerEl.textContent = formatTime(timeLeft);

  // Load random question
  const q = getRandomQuestion();
  gameState.question = q.question;
  gameState.answers = q.answers.map(a => ({
    answer: a.answer,
    points: a.points,
    revealed: false
  }));

  console.log("✅ New round loaded:", gameState);

  updateUI();
  inputEl.focus();

  roundActive = true;
}

// -------------------------------
// UI UPDATE
// -------------------------------
function updateUI() {
  roundTitleEl.textContent = `الجولة ${roundCounter + 1}`;
  questionEl.textContent = gameState.question;

  scoreAEl.textContent = teamScores.team1;
  scoreBEl.textContent = teamScores.team2;
  roundScoreEl.textContent = gameState.roundScore;

  const teamName = gameState.currentTeam === "team1" ? "الفريق أ" : "الفريق ب";
  currentTeamBox.textContent = gameState.isStealMode ? `${teamName} (محاولة سرقة!)` : teamName;

  strikesEl.textContent = "❌".repeat(gameState.wrongAttempts);

  renderAnswers();
}

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

// -------------------------------
// NORMALIZE
// -------------------------------
function normalize(str) {
  return String(str)
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[هة]/g, "ه")
    .replace(/[^\u0600-\u06FF0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^ال\s?/, "")
    .trim();
}

// -------------------------------
// SUBMIT ANSWER (LOCAL LOGIC)
// -------------------------------
function submitAnswer() {
  if (gameOver) return;

  const userInput = inputEl.value.trim();
  if (!userInput) return;

  const normalized = normalize(userInput);

  // هل نحن في وضع سرقة والفريق الحالي هو فريق السرقة؟
  const isStealTurn =
    gameState.isStealMode &&
    gameState.currentTeam !== gameState.originalTeam;

  // ابحث عن إجابة مطابقة
  const found = gameState.answers.find(
    a => normalize(a.answer) === normalized && !a.revealed
  );

  // ───────── وضع السرقة (محاولة واحدة فقط) ─────────
  if (isStealTurn) {
    if (found) {
      // إجابة صحيحة في السرقة → سرقة ناجحة
      gameState.roundScore += found.points;
      found.revealed = true;
      updateUI();

      // استخدم نفس منطقك القديم
      handleStealSuccess();
    } else {
      // إجابة خاطئة في السرقة → فشل السرقة
      handleStealFailure({
        originalTeam: gameState.originalTeam,
        roundScore: gameState.roundScore
      });
    }

    // بعد محاولة السرقة، ما فيه محاولات زيادة
    inputEl.value = "";
    inputEl.disabled = true;
    roundActive = false;
    return;
  }

  // ───────── الوضع العادي (قبل السرقة) ─────────
  if (found) {
    const result = {
      correct: true,
      answer: found.answer,
      roundScore: gameState.roundScore + found.points
    };
    handleCorrectAnswer(result);
  } else {
    gameState.wrongAttempts++;

    const stealModeActivated =
      !gameState.isStealMode && gameState.wrongAttempts >= 3;

    const result = {
      wrongAttempts: gameState.wrongAttempts,
      stealModeActivated
    };

    handleWrongAnswer(result);
  }

  inputEl.value = "";
  inputEl.focus();
}

// -------------------------------
// ORIGINAL LOGIC (UNCHANGED)
// -------------------------------
function handleCorrectAnswer(result) {
  gameState.roundScore = result.roundScore;

  const revealedAns = gameState.answers.find(
    a => normalize(a.answer) === normalize(result.answer) && !a.revealed
  );
  if (revealedAns) revealedAns.revealed = true;

  if (gameState.isStealMode && gameState.currentTeam !== gameState.originalTeam) {
    gameState.answers.forEach(a => a.revealed = true);
  }

  updateUI();

  const allRevealed = gameState.answers.every(a => a.revealed);

  if (allRevealed) {
    handleRoundEnd("انتهت الجولة - تم كشف جميع الإجابات");
  } else if (gameState.isStealMode && gameState.currentTeam !== gameState.originalTeam) {
    handleStealSuccess();
  }
}

function handleWrongAnswer(result) {
  gameState.wrongAttempts = result.wrongAttempts;
  updateUI();

  if (result.stealModeActivated && !gameState.isStealMode) {
    gameState.isStealMode = true;
    gameState.originalTeam = gameState.currentTeam;
    gameState.currentTeam = gameState.currentTeam === "team1" ? "team2" : "team1";
    gameState.wrongAttempts = 0;

    timeLeft = 180;
    timerEl.textContent = formatTime(timeLeft);

    showResultPopup("📢 تنبيه", "الآن دور الفريق الآخر لمحاولة السرقة!");
    updateUI();
  }
}

function handleStealSuccess() {
  const points = gameState.roundScore;
  const teamKey = gameState.currentTeam;

  showResultPopup("🎉 تمت السرقة بنجاح!", `الفريق حصل على ${points} نقطة`);

  setTimeout(() => {
    closeResultPopup();
    handleRoundEnd("تمت السرقة", teamKey);
  }, 2000);
}

function handleStealFailure(result) {
  const originalKey = result.originalTeam;
  handleRoundEnd("❌ فشلت السرقة", originalKey);
}

function handleRoundEnd(message, winnerTeamKey) {

  gameState.answers.forEach(a => a.revealed = true);
  updateUI();

  const points = gameState.roundScore;
  const teamKey = winnerTeamKey || gameState.currentTeam;

  teamScores[teamKey] += points;
  scoreAEl.textContent = teamScores.team1;
  scoreBEl.textContent = teamScores.team2;

  showResultPopup("🏁 انتهت الجولة", message);

  inputEl.disabled = true;
  roundActive = false;

  roundCounter++;

  // Always show button, never auto-advance
  const btn = document.getElementById("startRoundBtn");
  if (roundCounter >= maxRounds) {
    btn.textContent = "عرض النتيجة النهائية";
    btn.onclick = finishGame;
  } else {
    btn.textContent = "بدء جولة جديدة";
    btn.onclick = startNewRound;
  }
  btn.style.display = "inline-block";
}

function finishGame() {
  gameOver = true;

  const winner =
    teamScores.team1 > teamScores.team2 ? "الفريق أ" :
    teamScores.team2 > teamScores.team1 ? "الفريق ب" :
    "تعادل";

  const finalMessage = winner === "تعادل" 
    ? `تعادل!\nالفريق أ: ${teamScores.team1}\nالفريق ب: ${teamScores.team2}`
    : `الفائز هو ${winner}!\nالفريق أ: ${teamScores.team1}\nالفريق ب: ${teamScores.team2}`;

  showResultPopup("🎮 انتهت اللعبة", finalMessage);

  // Show restart button instead of auto-restart
  const btn = document.getElementById("startRoundBtn");
  btn.textContent = "بدء لعبة جديدة";
  btn.onclick = () => {
    closeResultPopup();
    roundCounter = 0;
    teamScores.team1 = 0;
    teamScores.team2 = 0;
    gameOver = false;
    startNewRound();
  };
  btn.style.display = "inline-block";
}

function showResultPopup(title, message) {
  document.getElementById("resultTitle").textContent = title;
  document.getElementById("resultMessage").textContent = message;
  document.getElementById("resultPopup").style.display = "flex";
}

function closeResultPopup() {
  document.getElementById("resultPopup").style.display = "none";
}

// -------------------------------
// TIMER
// -------------------------------

function formatTime(seconds){
  const m=Math.floor(seconds/60);
  const s=seconds%60;
  return `${m}:${String(s).padStart(2,"0")}`;
 }

let timeLeft = 180;
let roundActive = false;
timerEl.textContent=formatTime(timeLeft);

setInterval(() => {
  if (!roundActive) return;

  timeLeft--;
  timerEl.textContent = formatTime(timeLeft);

  if (timeLeft <= 0) {
    roundActive = false;

    if (!gameState.isStealMode) {
      gameState.isStealMode = true;
      gameState.originalTeam = gameState.currentTeam;
      gameState.currentTeam = gameState.currentTeam === "team1" ? "team2" : "team1";
      gameState.wrongAttempts = 0;

      timeLeft=180;
      timerEl.textContent=formatTime(timeLeft);

      showResultPopup("⏰ انتهى الوقت!", "الآن دور الفريق الآخر لمحاولة السرقة!");

      setTimeout(() => {
        closeResultPopup();
        updateUI();
        roundActive=true;
      }, 1500);
    } else {
      handleStealFailure({
        originalTeam: gameState.originalTeam,
        roundScore: gameState.roundScore
      });
    }
  }
}, 1000);

// -------------------------------
// EVENTS
// -------------------------------
document.querySelector(".input-section button").addEventListener("click", submitAnswer);

inputEl.addEventListener("keypress", e => {
  if (e.key === "Enter") submitAnswer();
});

window.addEventListener("load", startNewRound);