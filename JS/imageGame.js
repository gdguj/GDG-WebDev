let currentSessionId = null; // معرف الجلسة الحالية 
const urlParams = new URLSearchParams(window.location.search);
const customGameId = urlParams.get('id');
const TEMPLATE_GAME_TYPE = 'image_guessing';
const _urlPlayerTeam = String(urlParams.get('team') || '').toUpperCase();

// قراءة أسماء الفرق من URL (إذا جاء من اللوبي) وإلا من localStorage
const _urlTeamA = urlParams.get('teamA');
const _urlTeamB = urlParams.get('teamB');

function normalizeArabicFull(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ءؤئ]/g, '')
    .replace(/[^\u0600-\u06FF0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^ال\s?/, '')
    .replace(/\s+ال\s?/g, ' ')
    .trim();
}

function levenshteinDistance(a, b) {
  const len1 = a.length;
  const len2 = b.length;
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));
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
  const normalized = normalizeArabicFull(userInput);
  const expected = normalizeArabicFull(expectedAnswer);
  if (!normalized || !expected) return false;
  if (normalized === expected) return true;
  const userWords = normalized.split(' ').filter(Boolean);
  const expectedWords = expected.split(' ').filter(Boolean);
  if (userWords.length > 0 && expectedWords.length > 1) {
    for (const word of expectedWords) {
      if (userWords.some(w => w === word)) return true;
    }
  }
  if (levenshteinDistance(normalized, expected) === 1) return true;
  return false;
}

function readTeamName(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  const normalized = raw.trim().replace(/\s+/g, ' ');
  return normalized || fallback;
}

const TEAM_NAMES = {
  a: _urlTeamA ? decodeURIComponent(_urlTeamA) : readTeamName('imageGameTeamNameA', 'أ'),
  b: _urlTeamB ? decodeURIComponent(_urlTeamB) : readTeamName('imageGameTeamNameB', 'ب')
};

const GAME_TIME = 120;
const POINTS_PER_ANSWER = 2;


/* SECTION 2 — STATE */
const STATE = {
  scores:     { a: 0, b: 0 }, // نقاط كل فريق
  qi:         0,               // رقم السؤال الحالي
  shuffled:   [],              // الأسئلة بعد الخلط
  hintUsed: false,
  timeLeft: GAME_TIME,
  timer: null,
  answered: false,
  correctCount: 0,
  pendingResolve: null,
  syncTimer: null,
  syncingState: false,
  submittingAnswer: false,
  gameEnded: false,
  playerTeam: null,
};


/* SECTION 3 — DOM REFERENCES */
const DOM = {
  pic1:        document.getElementById('pic1'),
  pic2:        document.getElementById('pic2'),
  qcard:       document.getElementById('qcard'),
  inputRow:    document.getElementById('input-row'),
  answer:      document.getElementById('answer'),
  feedback:    document.getElementById('feedback'),
  submitBtn:   document.getElementById('submit-btn'),
  showAnswerBtn: document.getElementById('show-answer-btn'),
  toast:       document.getElementById('toast'),
  cwrap:       document.getElementById('cwrap'),
  scoreA:      document.getElementById('score-a'),
  scoreB:      document.getElementById('score-b'),
  teamAName:   document.getElementById('team-a-name'),
  teamBName:   document.getElementById('team-b-name'),
  skipTeamA:   document.getElementById('skip-team-a'),
  skipTeamB:   document.getElementById('skip-team-b'),
  teamACard:   document.getElementById('team-a-card'),
  teamBCard:   document.getElementById('team-b-card'),
  activeBadge: document.getElementById('active-team-badge'),
  bar: document.getElementById('bar'),
  hintBtn: document.getElementById('hint-btn'),
  overlay: document.getElementById('overlay'),
  hintText: document.getElementById('hint-text'),
  skipOverlay: document.getElementById('skip-overlay'),
  timeupOverlay: document.getElementById('timeup-overlay'),
};

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


/* SECTION 4 — INIT */
// function init() {
//   STATE.shuffled = [];
//   DOM.teamAName.textContent = TEAM_NAMES.a;
//   DOM.teamBName.textContent = TEAM_NAMES.b;
//   DOM.skipTeamA.textContent = TEAM_NAMES.a;
//   DOM.skipTeamB.textContent = TEAM_NAMES.b;
//   DOM.activeBadge.textContent = 'Both Teams Can Answer';
//   DOM.teamACard.classList.remove('active');
//   DOM.teamBCard.classList.remove('active');
//   loadQuestion();
// }
/* SECTION 4 — INIT (UPDATED) */
async function init() {
    // عرض أسماء الفرق كالعادة
    DOM.teamAName.textContent = TEAM_NAMES.a;
    DOM.teamBName.textContent = TEAM_NAMES.b;
    DOM.skipTeamA.textContent = TEAM_NAMES.a;
    DOM.skipTeamB.textContent = TEAM_NAMES.b;
    DOM.activeBadge.textContent = 'كلا الفريقين يجيب';

    if (customGameId) {
    sessionStorage.setItem('imageGameCustomId', customGameId);
  }

  try {
        if (customGameId) {
            // حالة اللعبة المخصصة
            console.log("Loading Custom Image Game:", customGameId);
            const response = await fetch(`/api/custom-games/${customGameId}`);
            const result = await response.json();

            if (result.success) {
                
                const customQuestions = result.game.data.questions.map(q => ({
                    p1: q.imageOne || q.p1, 
                    p2: q.imageTwo || q.p2,
                    answers: Array.isArray(q.answers) ? q.answers : [q.answer],
                    hint: q.hint || "",
                    pts: 4
                }));
                STATE.shuffled = customQuestions.filter(isValidQuestion);
            }
        } else {
              // الحالة العادية: جلب قالب لعبة الصور من Mongo (روابط Cloudinary)
              STATE.shuffled = await loadTemplateQuestions();
        }
    } catch (error) {
        console.error(" Error loading questions:", error);
            STATE.shuffled = [];
          }

          if (!STATE.shuffled.length) {
            DOM.feedback.className = 'feedback wrong';
            DOM.feedback.textContent = 'لا توجد أسئلة للعبة الصور في MongoDB حالياً.';
            DOM.submitBtn.disabled = true;
            DOM.submitBtn.style.display = 'none';
            DOM.showAnswerBtn.style.display = 'none';
            DOM.hintBtn.style.display = 'none';
            DOM.answer.disabled = true;
            return;
    }

    if (_lobbyJoinCode) {
      await resolveLobbyPlayerTeam();
      await startLobbySync();
      return;
    }

    loadQuestion();
}

init();


/* SECTION 5 — TEAM MANAGEMENT */
// This mode is non-turn-based. Any team can answer every round.


/* SECTION 6 — LOAD QUESTION */
function loadQuestion() {
  if (STATE.qi >= STATE.shuffled.length) {
    showGameOver();
    return;
  }


  const q = STATE.shuffled[STATE.qi];

  // pic1 = يسار، pic2 = يمين — imageOne تظهر على اليمين
  DOM.pic1.src = q.p1;
  DOM.pic2.src = q.p2;

  // تنظيف الحقل والـ feedback
  DOM.answer.value         = '';
  DOM.feedback.className   = 'feedback';
  DOM.feedback.textContent = '';
  DOM.inputRow.classList.remove('wrong-border');
  DOM.submitBtn.classList.remove('fading');
  DOM.submitBtn.style.display = 'block';
  DOM.submitBtn.disabled = false;
  DOM.showAnswerBtn.style.display = 'block';
  DOM.showAnswerBtn.textContent = 'عرض الإجابة';
  DOM.showAnswerBtn.onclick = showAnswer;
  DOM.answer.disabled = false;
  DOM.answer.focus();
  hideTimeUpOverlay();
  STATE.hintUsed = false;
  DOM.hintBtn.classList.remove('used');
  DOM.hintBtn.style.display = 'inline-block';
  STATE.answered = false;
  resetTimer();
}


// عرض كود الانضمام الموجود من URL (لا ينشئ جديد)
const _lobbyJoinCode = urlParams.get('joinCode');

function applyLobbyState(sharedState, forceReload = false) {
  if (!sharedState) return;

  const nextQi = Number(sharedState.questionIndex || 0);
  const scoreA = Number(sharedState.scoreA || 0);
  const scoreB = Number(sharedState.scoreB || 0);

  STATE.scores.a = scoreA;
  STATE.scores.b = scoreB;
  STATE.correctCount = Number(sharedState.correctCount || 0);
  DOM.scoreA.textContent = scoreA;
  DOM.scoreB.textContent = scoreB;

  if (Boolean(sharedState.finished) || nextQi >= STATE.shuffled.length) {
    STATE.qi = nextQi;
    if (!STATE.gameEnded) {
      STATE.gameEnded = true;
      showGameOver();
    }
    return;
  }

  if (forceReload || nextQi !== STATE.qi) {
    STATE.qi = nextQi;
    loadQuestion();
  }
}

async function fetchLobbyState(forceReload = false) {
  if (!_lobbyJoinCode || STATE.syncingState) return;

  STATE.syncingState = true;
  try {
    const res = await fetch('/api/lobby/game-state/' + encodeURIComponent(_lobbyJoinCode));
    const data = await res.json();
    if (data && data.success && data.state) {
      applyLobbyState(data.state, forceReload);
    }
  } catch (_) {
    DOM.feedback.className = 'feedback wrong';
    DOM.feedback.textContent = 'تعذر مزامنة اللعبة. تأكد من إعادة تشغيل السيرفر.';
  } finally {
    STATE.syncingState = false;
  }
}

async function startLobbySync() {
  await fetchLobbyState(true);
  clearInterval(STATE.syncTimer);
  STATE.syncTimer = setInterval(() => fetchLobbyState(false), 900);
}

async function submitLobbyAnswer(team, rawInput) {
  if (!_lobbyJoinCode || STATE.submittingAnswer || STATE.gameEnded) return;

  const payloadAnswer = String(rawInput || '').trim();
  if (!payloadAnswer) return;

  STATE.submittingAnswer = true;
  try {
    const res = await fetch('/api/lobby/game-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: _lobbyJoinCode,
        team: String(team || '').toUpperCase(),
        answer: payloadAnswer,
        questionIndex: STATE.qi,
      }),
    });
    const data = await res.json();

    if (!data || !data.success) {
      DOM.feedback.className = 'feedback wrong';
      DOM.feedback.textContent = (data && data.message) ? data.message : 'تعذر إرسال الإجابة';
      return;
    }

    if (data.stale) {
      applyLobbyState(data.state, true);
      return;
    }

    if (data.isCorrect) {
      DOM.feedback.className = 'feedback correct';
      DOM.feedback.textContent = '✓ إجابة صحيحة!';
      DOM.answer.value = '';
      applyLobbyState(data.state, true);
      return;
    }

    handleWrong();
  } catch (_) {
    DOM.feedback.className = 'feedback wrong';
    DOM.feedback.textContent = 'تعذر إرسال الإجابة. تأكد من تشغيل السيرفر.';
  } finally {
    STATE.submittingAnswer = false;
  }
}

async function requestLobbyNextQuestion() {
  if (!_lobbyJoinCode || STATE.gameEnded) return;

  try {
    const res = await fetch('/api/lobby/game-next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: _lobbyJoinCode,
        questionIndex: STATE.qi,
      }),
    });
    const data = await res.json();
    if (data && data.success && data.state) {
      applyLobbyState(data.state, true);
    }
  } catch (_) {
  }
}

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

function resetTimer() {
  clearInterval(STATE.timer);
  STATE.timeLeft = GAME_TIME;
  DOM.bar.classList.remove('danger');
  DOM.bar.style.transition = 'none';
  DOM.bar.style.width = '100%';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      DOM.bar.style.transition = 'width 1s linear, background 0.4s ease';
      STATE.timer = setInterval(tickTimer, 1000);
    });
  });
}

function tickTimer() {
  STATE.timeLeft--;
  DOM.bar.style.width = (STATE.timeLeft / GAME_TIME * 100) + '%';

  if (STATE.timeLeft <= 3) {
    DOM.bar.classList.add('danger');
  }

  if (STATE.timeLeft <= 0) {
    clearInterval(STATE.timer);
    handleTimesUp();
  }
}


function handleTimesUp() {
  if (STATE.answered) return;

  STATE.answered = true;
  DOM.feedback.className = 'feedback skipped';
  DOM.feedback.textContent = "";
  DOM.qcard.classList.add('times-up');
  DOM.submitBtn.style.display = 'none';
  DOM.hintBtn.style.display = 'none';
  DOM.answer.disabled = true;
  showTimeUpOverlay();
  
  // Show Answer button: "Show Answer" when time's up
  DOM.showAnswerBtn.style.display = 'block';
  DOM.showAnswerBtn.textContent = 'عرض الإجابة';
  DOM.showAnswerBtn.onclick = showAnswer;
  
  setTimeout(() => {
    DOM.qcard.classList.remove('times-up');
  }, 1000);
}


function openHint() {
  if (STATE.hintUsed || STATE.answered) return;

  STATE.hintUsed = true;
  DOM.hintBtn.classList.add('used');

  const q = STATE.shuffled[STATE.qi];
  DOM.hintText.textContent = q.hint;
  DOM.overlay.classList.add('open');
}

function closeHint(event) {
  if (event && event.target !== DOM.overlay) return;
  DOM.overlay.classList.remove('open');
}

function showTimeUpOverlay() {
  if (!DOM.timeupOverlay) return;
  DOM.timeupOverlay.classList.add('open');
  setTimeout(() => hideTimeUpOverlay(), 5000);
}

function hideTimeUpOverlay() {
  if (!DOM.timeupOverlay) return;
  DOM.timeupOverlay.classList.remove('open');
}

/* SECTION 7 —ANSWER CHECKING */
function check(answeringTeam) {
  // Only prevent check if answer is already submitted/confirmed
  if (STATE.answered) return;

  const input = DOM.answer.value.trim();
  if (!input) return;

  if (_lobbyJoinCode) {
    if (!STATE.playerTeam) {
      DOM.feedback.className = 'feedback wrong';
      DOM.feedback.textContent = 'تعذر تحديد فريقك من اللوبي';
      return;
    }
    submitLobbyAnswer(STATE.playerTeam, input);
    return;
  }

  const q       = STATE.shuffled[STATE.qi];
  const isRight = q.answers.some(a => matchAnswer(input, a));

  if (isRight) {
    handleCorrect(answeringTeam);
  } else {
    handleWrong();
  }
}

// صح: أضف نقاط
function handleCorrect(answeringTeam) {
  STATE.answered = true;

  DOM.feedback.className   = 'feedback correct';
  DOM.feedback.textContent = '✓ إجابة صحيحة!';
  DOM.qcard.classList.add('flash-correct');
  DOM.submitBtn.style.display = 'none';
  DOM.hintBtn.style.display = 'none';
  DOM.answer.disabled = true;
  clearInterval(STATE.timer);

  if (_lobbyJoinCode && (answeringTeam === 'a' || answeringTeam === 'b')) {
    // في وضع اللوبي: الفريق الذي ضغط هو الذي يأخذ النقاط مباشرة
    STATE.scores[answeringTeam] += POINTS_PER_ANSWER;
    STATE.correctCount += 1;
    DOM.scoreA.textContent = STATE.scores.a;
    DOM.scoreB.textContent = STATE.scores.b;
    showToast(`${TEAM_NAMES[answeringTeam]} +${POINTS_PER_ANSWER}`);
    spawnConfetti();
    DOM.showAnswerBtn.style.display = 'block';
    DOM.showAnswerBtn.textContent = 'الجولة التالية';
    DOM.showAnswerBtn.onclick = nextRound;
  } else {
    STATE.pendingResolve = 'correct';
    openWhoAnsweredChooser('مين جاوب الإجابة الصحيحة؟');
  }

  setTimeout(() => {
    DOM.qcard.classList.remove('flash-correct');
  }, 900);
}

// غلط: بدون نقاط + إمكانية المحاولة مجددا أو التخلي
function handleWrong() {
  DOM.feedback.className   = 'feedback wrong';
  DOM.feedback.textContent = '✗ خطأ! حاول مرة أخرى';
  DOM.inputRow.classList.add('wrong-border');
  DOM.qcard.classList.add('flash-wrong');
  
  // Clear input for next attempt
  DOM.answer.value = '';
  DOM.answer.focus();
  
  // Show Answer button: "Show Answer" for wrong answers
  DOM.showAnswerBtn.style.display = 'block';
  DOM.showAnswerBtn.textContent = 'عرض الإجابة';
  DOM.showAnswerBtn.onclick = showAnswer;

  setTimeout(() => {
    DOM.qcard.classList.remove('flash-wrong');
    DOM.inputRow.classList.remove('wrong-border');
    DOM.feedback.textContent = '';
  }, 600);
}

DOM.answer.addEventListener('keydown', e => {
  if (e.key === 'Enter') check();
});


/* SECTION 8 — SHOW ANSWER & NEXT ROUND */
function showAnswer() {
  hideTimeUpOverlay();
  STATE.pendingResolve = 'skip';
  if (_lobbyJoinCode) {
    // في وضع اللوبي: تخطّي السؤال يكون مشتركاً للجميع
    requestLobbyNextQuestion();
    return;
  }
  openWhoAnsweredChooser('مين الي جاوب؟');
}

function openWhoAnsweredChooser(titleText) {
  const titleEl = document.getElementById('skip-question-title');
  if (titleEl) {
    titleEl.textContent = titleText;
  }
  DOM.skipOverlay.classList.add('open');
}

function closeSkipChooser(event) {
  if (event && event.target !== DOM.skipOverlay) return;
  DOM.skipOverlay.classList.remove('open');
}

function applySkipChoice(teamChoice) {
  DOM.skipOverlay.classList.remove('open');

  if (teamChoice === 'a' || teamChoice === 'b') {
    STATE.scores[teamChoice] += POINTS_PER_ANSWER;
    STATE.correctCount += 1;
    DOM.scoreA.textContent = STATE.scores.a;
    DOM.scoreB.textContent = STATE.scores.b;
    showToast(`${TEAM_NAMES[teamChoice]} +${POINTS_PER_ANSWER}`);
    spawnConfetti();
  }

  if (STATE.pendingResolve === 'correct') {
    DOM.showAnswerBtn.style.display = 'block';
    DOM.showAnswerBtn.textContent = 'الجولة التالية';
    DOM.showAnswerBtn.onclick = nextRound;
  } else {
    revealCurrentAnswer();
  }

  STATE.pendingResolve = null;
}

function revealCurrentAnswer() {
  STATE.answered = true;
  DOM.answer.disabled = true;
  DOM.submitBtn.disabled = true;
  DOM.submitBtn.style.display = 'none';
  clearInterval(STATE.timer);

  const q = STATE.shuffled[STATE.qi];
  const answerText = q.answers.join(' / ');

  DOM.feedback.className = 'feedback correct';
  DOM.feedback.textContent = `الإجابة الصحيحة: ${answerText}`;

  DOM.showAnswerBtn.textContent = 'الجولة التالية';
  DOM.showAnswerBtn.onclick = nextRound;
}

function nextRound() {
  if (_lobbyJoinCode) {
    requestLobbyNextQuestion();
    return;
  }
  STATE.qi++;
  loadQuestion();
}

async function persistScore(gameType, points, externalSessionId, metadata) {
  try {
    if (!customGameId) return;

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
        source: 'image_guessing_custom',
        metadata: {
          ...metadata,
          customGameId,
        },
      }),
    });
  } catch (error) {
    console.error('Score persistence failed:', error);
  }
}

/* SECTION 9 — GAME OVER */
async function showGameOver() {
  clearInterval(STATE.timer);
  clearInterval(STATE.syncTimer);
  DOM.answer.disabled = true;
  DOM.submitBtn.style.display = 'none';
  DOM.showAnswerBtn.style.display = 'none';
  
  const winnerKey = STATE.scores.a > STATE.scores.b ? 'a' :
                    STATE.scores.b > STATE.scores.a ? 'b' : 'tie';
  const winnerName = winnerKey === 'tie' ? 'تعادل' : TEAM_NAMES[winnerKey];

  const resultPayload = {
    winner: winnerName,
    winnerKey,
    teamNameA: TEAM_NAMES.a,
    teamNameB: TEAM_NAMES.b,
    scoreA: STATE.scores.a,
    scoreB: STATE.scores.b,
    winnerScore: winnerKey === 'a' ? STATE.scores.a : winnerKey === 'b' ? STATE.scores.b : STATE.scores.a,
    correct: STATE.correctCount,
    totalWords: STATE.shuffled.length,
    pointsPerAnswer: POINTS_PER_ANSWER
  };

  await persistScore('image_guessing', resultPayload.winnerScore, `image-local-${Date.now()}`, {
    winnerKey,
    winnerName,
    scoreA: STATE.scores.a,
    scoreB: STATE.scores.b,
  });

  resultPayload.customGameId = customGameId || null;
  sessionStorage.setItem('imageGameResult', JSON.stringify(resultPayload));
  // حفظ رابط إعادة اللعب → يرجع للوبي لإنشاء غرفة جديدة
  const playAgainUrl = customGameId
    ? 'game-lobby.html?gameId=' + encodeURIComponent(customGameId) + '&gameType=image_guessing&role=host'
    : 'my-games.html';
  sessionStorage.setItem('imageGamePlayAgainUrl', playAgainUrl);
  window.location.href = 'Image-game-result-page.html';
}


/* SECTION 10 — VISUAL EFFECTS */
function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.add('show');
  setTimeout(() => DOM.toast.classList.remove('show'), 1500);
}

function spawnConfetti() {
  const COLORS = ['#EE4032','#FFC10E','#2CB35D','#007AC0','#BAD97E','#B1E2F7'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'cp';
    p.style.left              = Math.random() * 100 + '%';
    p.style.background        = COLORS[Math.floor(Math.random() * COLORS.length)];
    p.style.animationDuration = (.6 + Math.random() * .9) + 's';
    p.style.animationDelay    = (Math.random() * .4) + 's';
    p.style.transform         = `rotate(${Math.random() * 360}deg)`;
    DOM.cwrap.appendChild(p);
    setTimeout(() => p.remove(), 1800);
  }
}


/* SECTION 11 — UTILS */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidQuestion(q) {
  if (!q) return false;
  const answers = Array.isArray(q.answers) ? q.answers : [];
  return Boolean(q.p1 && q.p2 && answers.length);
}

async function loadTemplateQuestions() {
  const templateId = localStorage.getItem('imageGameTemplateId');

  if (templateId) {
    /* جلب المرحلة المختارة بالـ ID */
    const response = await fetch(`/api/games/templates/${encodeURIComponent(templateId)}`);
    const result   = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Template fetch failed');
    }

    const tpl = result.data;
    const rawQuestions = tpl && tpl.data && Array.isArray(tpl.data.questions)
      ? tpl.data.questions
      : [];

    return rawQuestions.map((q) => ({
      p1:      q.imageOne || q.p1 || '',
      p2:      q.imageTwo || q.p2 || '',
      answers: Array.isArray(q.answers) ? q.answers.filter(Boolean) : (q.answer ? [q.answer] : []),
      hint:    q.hint || '',
      pts:     4,
    })).filter(isValidQuestion);
  }

  /* fallback: أول قالب image_guessing في الداتابيس */
  const response = await fetch(`/api/games/templates?gameType=${encodeURIComponent(TEMPLATE_GAME_TYPE)}`);
  const result   = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Template fetch failed');
  }

  const templates = Array.isArray(result.data) ? result.data : [];
  if (!templates.length) {
    return [];
  }

  const latestTemplate = templates[0];
  const rawQuestions = latestTemplate && latestTemplate.data && Array.isArray(latestTemplate.data.questions)
    ? latestTemplate.data.questions
    : [];

  return rawQuestions.map((q) => ({
    p1:      q.imageOne || q.p1 || '',
    p2:      q.imageTwo || q.p2 || '',
    answers: Array.isArray(q.answers) ? q.answers.filter(Boolean) : (q.answer ? [q.answer] : []),
    hint:    q.hint || '',
    pts:     4,
  })).filter(isValidQuestion);
}

function getCurrentPlayerName() {
  const userRaw = localStorage.getItem('gdgCurrentUser') || sessionStorage.getItem('gdgCurrentUser');
  if (!userRaw) return '';

  try {
    const user = JSON.parse(userRaw);
    return String((user && user.name) || '').trim();
  } catch (_) {
    return '';
  }
}

async function resolveLobbyPlayerTeam() {
  if (!_lobbyJoinCode) return;

  if (_urlPlayerTeam === 'A' || _urlPlayerTeam === 'B') {
    STATE.playerTeam = _urlPlayerTeam;
    const urlTeamLabel = _urlPlayerTeam === 'A' ? TEAM_NAMES.a : TEAM_NAMES.b;
    DOM.activeBadge.textContent = `فريقك: ${urlTeamLabel}`;
    return;
  }

  const playerName = getCurrentPlayerName();
  if (!playerName) return;

  try {
    const res = await fetch('/api/lobby/info/' + encodeURIComponent(_lobbyJoinCode));
    const data = await res.json();
    if (!data || !data.success) return;

    const me = (data.players || []).find((p) => String(p.name || '').trim() === playerName);
    if (me && (me.team === 'A' || me.team === 'B')) {
      STATE.playerTeam = me.team;
      const teamLabel = me.team === 'A' ? TEAM_NAMES.a : TEAM_NAMES.b;
      DOM.activeBadge.textContent = `فريقك: ${teamLabel}`;
    }
  } catch (_) {}
}