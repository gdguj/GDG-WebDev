// ===============================
//  Family Feud – JSON Version
//  (Same logic as server-driven version)
// ===============================

let currentSessionId = null; // معرف الجلسة الحالية 
const urlParams = new URLSearchParams(window.location.search);
const customGameId = urlParams.get('id');
// أسماء الفرق من URL (من اللوبي)
const _surveyTeamA = urlParams.get('teamA') ? decodeURIComponent(urlParams.get('teamA')) : 'أ';
const _surveyTeamB = urlParams.get('teamB') ? decodeURIComponent(urlParams.get('teamB')) : 'ب';
const FAMILY_FEUD_API_BASE = "http://localhost:5000/api/family-feud";

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

async function persistScore(gameType, points, externalSessionId, metadata) {
  try {
    const token = localStorage.getItem('gdgAuthToken') || sessionStorage.getItem('gdgAuthToken');
    if (!token) return;

    await fetch('/api/scores/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        gameType,
        points,
        externalSessionId,
        source: 'survey_game_local',
        metadata,
      }),
    });
  } catch (error) {
    console.error('Score persistence failed:', error);
  }
}

let roundHistory = [];

function getTeamLabel(teamKey) {
  return teamKey === "team1" ? _surveyTeamA : _surveyTeamB;
}

function getStarterTeamFromNavigation() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("starter");
  if (fromQuery === "team1" || fromQuery === "team2") {
    sessionStorage.removeItem("familyFeudStarterTeam");
    return fromQuery;
  }

  const fromSession = sessionStorage.getItem("familyFeudStarterTeam");
  if (fromSession === "team1" || fromSession === "team2") {
    sessionStorage.removeItem("familyFeudStarterTeam");
    return fromSession;
  }

  return null;
}

const initialStarterTeam = getStarterTeamFromNavigation() || "team1";

function getRoundStarterTeam(roundIndex) {
  if (roundIndex % 2 === 0) {
    return initialStarterTeam;
  }

  return initialStarterTeam === "team1" ? "team2" : "team1";
}

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

function focusInputWithoutScroll() {
  try {
    inputEl.focus({ preventScroll: true });
  } catch (error) {
    inputEl.focus();
  }
}

function scrollPageToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function showJoinPopup(message, type = 'info') {
  const existing = document.getElementById('join-popup-overlay');
  if (existing) existing.remove();

  if (!document.getElementById('join-popup-style')) {
    const style = document.createElement('style');
    style.id = 'join-popup-style';
    style.textContent = `
      @keyframes joinPopupIn {
        from { transform: scale(.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  const icon = type === 'error' ? '⚠️' : type === 'success' ? '🎉' : 'ℹ️';

  const overlay = document.createElement('div');
  overlay.id = 'join-popup-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    z-index: 99999; font-family: 'Cairo', sans-serif; direction: rtl;
  `;

  overlay.innerHTML = `
    <div style="
      background:#fff; border-radius:18px; padding:34px 38px;
      max-width:420px; width:92%; text-align:center;
      box-shadow:0 8px 40px rgba(0,0,0,0.18);
      animation: joinPopupIn .22s ease;
    ">
      <div style="font-size:2rem; margin-bottom:12px;">${icon}</div>
      <p style="font-size:1.05rem; color:#333; font-weight:700; margin:0 0 22px; line-height:1.8;">${message}</p>
      <button id="join-popup-ok-btn" style="
        background:#0078BF; color:#fff; border:none;
        padding:10px 34px; border-radius:10px; font-size:1rem;
        font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;
      ">حسناً</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#join-popup-ok-btn').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
}

// عرض كود الانضمام الموجود من URL (لا ينشئ جديد)
const _lobbyJoinCode = urlParams.get('joinCode');

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('multiplayerBtn');
  if (!btn) return;
  if (!_lobbyJoinCode) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.title = 'هذه اللعبة ليست من لوبي';
  }
});

function startMultiplayer() {
  if (!_lobbyJoinCode) return;
  showJoinPopup(`كود الانضمام: <strong>${_lobbyJoinCode}</strong><br>أرسله لأصدقائك الآن!`, 'success');
}


// -------------------------------
// JSON QUESTIONS
// -------------------------------
let questionsData = [];
let remainingQuestionIndexes = [];

// تحميل الأسئلة من JSON
async function loadQuestions() {
  console.log("🔄 Loading questions...");
  try {

      if (customGameId) {
            // الحالة الأولى: داخلين لعبة من صنع المستخدم
            console.log("Loading custom game with ID:", customGameId);
            response = await fetch(`/api/custom-games/${customGameId}`);
            const result = await response.json();
            
            if (result.success) {
            currentSessionId = "CUSTOM_" + result.game._id;
        
            questionsData = result.game.data.questions.map(q => ({
            question: q.question || q.text, 
            answers: (q.answers || []).map(a => ({
                answer: a.answer || a.text,
                points: parseInt(a.points) || 10,
                keywords: Array.isArray(a.keywords) ? a.keywords : (a.synonyms || [])
            }))
        }));
            }
        } else {


    const res = await fetch(`${FAMILY_FEUD_API_BASE}`, { cache: "no-store" });
    console.log("📡 Fetch response status:", res.status);
    
    if (!res.ok) {
      throw new Error(`Failed to load questions JSON: ${res.status}`);
    }

    const payload = await res.json();
    questionsData = payload && Array.isArray(payload.questions) ? payload.questions : [];
    console.log("✅ Questions loaded successfully:", questionsData);
    
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      throw new Error("Questions JSON is empty or invalid.");
    }

    // Keep a rotating pool so rounds do not repeat questions until all are used.
    remainingQuestionIndexes = questionsData.map((_, index) => index);
    console.log("🎲 Remaining questions pool:", remainingQuestionIndexes);}

  } catch (error) {
    console.error("❌ Error loading questions:", error);
    throw error;
  }
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
  console.log("🎮 startNewRound() called");
  
  if (gameOver) {
    console.log("❌ Game is over, cannot start new round");
    return;
  }

  const btn = document.getElementById("startRoundBtn");
  if (btn) btn.style.display = "none";

  inputEl.disabled = false;

  if (questionsData.length === 0) {
    console.log("📥 Questions not loaded yet, loading now...");
    await loadQuestions();
  }

  console.log("🔄 Starting new round...");

  // Reset round state
  gameState.roundScore = 0;
  gameState.wrongAttempts = 0;
  gameState.isStealMode = false;
  gameState.originalTeam = null;

  // Use wheel winner in round 1, then alternate each round.
  gameState.currentTeam = getRoundStarterTeam(roundCounter);

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
  console.log("✅ Random question loaded:", q);
  
  gameState.question = q.question;
  gameState.answers = q.answers.map(a => ({
    answer: a.answer,
    points: a.points,
    keywords: Array.isArray(a.keywords) ? a.keywords : (a.synonyms || []),
    revealed: false
  }));

  console.log("✅ New round loaded:", gameState);

  updateUI();
  focusInputWithoutScroll();
  scrollPageToTop();

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
    .replace(/[\u064B-\u0652\u0640]/g, "")  // شكل وتشديد
    .replace(/[أإآ]/g, "ا")                  // توحيد الألف
    .replace(/[ىي]/g, "ي")                   // توحيد الياء
    .replace(/[ة]/g, "ه")                   // توحيد التاء المربوطة
    .replace(/[ؤئء]/g, "")                   // حذف الهمزات المتغيرة
    .replace(/[^؀-ۿ0-9\s]/g, "")  // إزالة غير العربي
    .replace(/\s+/g, " ")
    .replace(/^ال\s?/, "")                   // إزالة ال التعريف
    .replace(/\s+ال\s?/g, " ")
    .trim();
}

function levenshteinDistance(a, b) {
  const len1 = a.length;
  const len2 = b.length;
  const matrix = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let i = 0; i <= len2; i++) matrix[i][0] = i;

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len2][len1];
}

function matchAnswer(userInput, expectedAnswer) {
  const normalized = normalize(userInput);
  const expected = normalize(expectedAnswer);

  if (!normalized || !expected) return false;

  if (normalized === expected) return true;

  const userWords = normalized.split(" ").filter(Boolean);
  const expectedWords = expected.split(" ").filter(Boolean);

  if (userWords.length > 0 && expectedWords.length > 1) {
    for (const word of expectedWords) {
      if (userWords.some((w) => w === word)) {
        return true;
      }
    }
  }

  const distance = levenshteinDistance(normalized, expected);
  if (distance === 1) return true;

  return false;
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

  // ابحث عن إجابة مطابقة (الإجابة الأصلية أو أي مرادف)
  const found = gameState.answers.find(a => {
    if (a.revealed) return false;
    if (matchAnswer(userInput, a.answer)) return true;

    const keywords = Array.isArray(a.keywords)
      ? a.keywords
      : Array.isArray(a.synonyms)
        ? a.synonyms
        : [];

    if (keywords.some(s => normalize(s) === normalized)) return true;
    return false;
  });

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
  focusInputWithoutScroll();
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

  const stealAttempted = Boolean(gameState.originalTeam);
  const stealByTeam = stealAttempted
    ? (gameState.originalTeam === "team1" ? "team2" : "team1")
    : null;
  const stealSuccessful = stealAttempted && stealByTeam === teamKey;

  roundHistory.push({
    round: roundCounter + 1,
    question: gameState.question,
    winnerTeam: teamKey,
    winnerTeamLabel: getTeamLabel(teamKey),
    pointsAwarded: points,
    endReason: message,
    stealAttempted,
    stealByTeam,
    stealByTeamLabel: stealByTeam ? getTeamLabel(stealByTeam) : null,
    stolenFromTeam: stealAttempted ? gameState.originalTeam : null,
    stolenFromTeamLabel: stealAttempted ? getTeamLabel(gameState.originalTeam) : null,
    stealSuccessful
  });

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

async function finishGame() {
  gameOver = true;

  const winnerTeamKey =
    teamScores.team1 > teamScores.team2 ? "team1" :
    teamScores.team2 > teamScores.team1 ? "team2" :
    "draw";

  const finalResultPayload = {
    winnerTeam: winnerTeamKey,
    winnerLabel: winnerTeamKey === "draw" ? "تعادل" : getTeamLabel(winnerTeamKey),
    scoreTeam1: teamScores.team1,
    scoreTeam2: teamScores.team2,
    roundsPlayed: roundCounter,
    rounds: roundHistory,
    generatedAt: new Date().toISOString()
  };

  const winnerPoints = Math.max(teamScores.team1, teamScores.team2);
  await persistScore('survey_game', winnerPoints, `survey-local-${Date.now()}`, {
    winnerTeam: winnerTeamKey,
    roundsPlayed: roundCounter,
  });

  sessionStorage.setItem("familyFeudFinalResult", JSON.stringify(finalResultPayload));
  window.location.href = "survey-results.html";
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

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.addEventListener("load", () => {
  scrollPageToTop();
  startNewRound();
});

window.addEventListener("pageshow", () => {
  scrollPageToTop();
});