const QUESTIONS = [
  { p1:"☕", p2:"📜", answers:["javascript","js"], hint:"A scripting language that runs in the browser.", pts:4 },
  { p1:"🍎", p2:"🏪", answers:["app store","appstore"], hint:"Where you download apps on iPhone.", pts:4 },
  { p1:"🌍", p2:"🔗", answers:["internet"], hint:"The global network connecting all computers.", pts:4 },
  { p1:"📱", p2:"💬", answers:["whatsapp"], hint:"A messaging app owned by Meta.", pts:4 },
  { p1:"🐦", p2:"✉️", answers:["twitter","x"], hint:"Social media platform known for short posts.", pts:4 },
  { p1:"🎬", p2:"▶️", answers:["youtube"], hint:"The world's largest video-sharing platform.", pts:4 },
  { p1:"🔑", p2:"🔒", answers:["password"], hint:"What protects your online accounts.", pts:4 },
  { p1:"☁️", p2:"💾", answers:["cloud"], hint:"Storing files on the internet, not a local drive.", pts:4 },
  { p1:"🤖", p2:"🧠", answers:["ai","artificial intelligence"], hint:"Technology that makes machines think like humans.", pts:4 },
  { p1:"🐍", p2:"💻", answers:["python"], hint:"Popular programming language for data science.", pts:4 },
];


/*SECTION 2 — GAME STATE */
const STATE = {
  scores:     { a: 0, b: 0 },   // each team's score
  activeTeam: 'a',               // 'a' = Team A (blue), 'b' = Team B (green)
  qi:         0,                 // current question index in shuffled array
  hintsUsed:  0,                 // hint uses for current question (resets each turn)
  timeLeft:   15,                // 15 seconds per turn
  timer:      null,              // setInterval reference
  shuffled:   [],                // shuffled copy of QUESTIONS
  answered:   false,             // true once current turn has been answered or skipped
};


/*SECTION 3 — DOM REFERENCES */
const DOM = {
  bar:          document.getElementById('bar'),
  pic1:         document.getElementById('pic1'),
  pic2:         document.getElementById('pic2'),
  qcard:        document.getElementById('qcard'),
  inputRow:     document.getElementById('input-row'),
  answer:       document.getElementById('answer'),
  feedback:     document.getElementById('feedback'),
  submitBtn:    document.getElementById('submit-btn'),
  hintBtn:      document.getElementById('hint-btn'),
  hcount:       document.getElementById('hcount'),
  overlay:      document.getElementById('overlay'),
  hintText:     document.getElementById('hint-text'),
  toast:        document.getElementById('toast'),
  cwrap:        document.getElementById('cwrap'),
  scoreA:       document.getElementById('score-a'),
  scoreB:       document.getElementById('score-b'),
  teamACard:    document.getElementById('team-a-card'),
  teamBCard:    document.getElementById('team-b-card'),
  activeBadge:  document.getElementById('active-team-badge'),
};

/* SECTION 4 — INITIALISATION */
/** AI INTEGRATION:
 * Replace the shuffle line with an API call:
 *   async function init() {
 *     STATE.shuffled = await fetchQuestionsFromAI(10);
 *     setActiveTeam('a');
 *     loadQuestion();
 *   } */
function init() {
  STATE.shuffled = shuffle([...QUESTIONS]);
  setActiveTeam('a');
  loadQuestion();
}

init();


/* SECTION 5 — TEAM MANAGEMENT */
/** setActiveTeam(team)
 * @param {'a'|'b'} team — which team becomes active */

function setActiveTeam(team) {
  STATE.activeTeam = team;
  const isA = team === 'a';

  DOM.submitBtn.classList.toggle('green-btn', !isA);
  DOM.teamACard.classList.toggle('active', isA);
  DOM.teamBCard.classList.toggle('active', !isA);
  DOM.activeBadge.textContent = isA ? "🔵 Team A's Turn" : "🟢 Team B's Turn";
  DOM.activeBadge.classList.toggle('team-b-turn', !isA);
  DOM.inputRow.classList.toggle('team-b-active', !isA);
}

function switchTeam() {
  setActiveTeam(STATE.activeTeam === 'a' ? 'b' : 'a');
}


/* SECTION 6 — QUESTION LOADER */
/** AI INTEGRATION:
 * Option B (per-question fetch) — make this async and await an API call here.
 *   When switching to real images:
 *     Change: DOM.pic1.textContent = q.p1  →  DOM.pic1.src = q.p1
 *     Change: DOM.pic2.textContent = q.p2  →  DOM.pic2.src = q.p2 */
function loadQuestion() {
  // Wrap around if all questions have been shown
  if (STATE.qi >= STATE.shuffled.length) {
    showGameOver(); // استدعاء دالة نهاية اللعبة
    return;
  }

  const q = STATE.shuffled[STATE.qi];

  DOM.pic1.textContent = q.p1;
  DOM.pic2.textContent = q.p2;

  DOM.answer.value         = '';
  DOM.feedback.className   = 'feedback';
  DOM.feedback.textContent = '';
  DOM.inputRow.classList.remove('wrong-border');
  DOM.answer.focus();

  STATE.hintsUsed = 0;
  DOM.hcount.textContent = 0;
  DOM.hintBtn.classList.remove('used');

  STATE.answered = false;
  DOM.submitBtn.classList.remove('fading');
  resetTimer();
}

function showGameOver() {
  clearInterval(STATE.timer);
  
  DOM.inputRow.style.display = 'none';
  DOM.submitBtn.style.display = 'none';
  
  DOM.feedback.className = 'feedback correct';
  DOM.feedback.style.fontSize = '1.5rem';
  DOM.feedback.textContent = "🏁 Game Over! All questions answered.";
  
  DOM.pic1.textContent = "🏆";
  DOM.pic2.textContent = "✨";

  console.log("Final Scores:", STATE.scores);
  // ملاحظة: هنا سنضع كود الانتقال لصفحة النتائج لاحقاً
}

/* SECTION 7 — TIMER */
function resetTimer() {
  clearInterval(STATE.timer);
  STATE.timeLeft = 15;

  DOM.bar.classList.remove('danger');
  DOM.bar.style.transition = 'none';
  DOM.bar.style.width      = '100%';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      DOM.bar.style.transition = 'width 1s linear, background 0.4s ease';
      STATE.timer = setInterval(tickTimer, 1000);
    });
  });
}

function tickTimer() {
  STATE.timeLeft--;
  DOM.bar.style.width = (STATE.timeLeft / 15 * 100) + '%';

  if (STATE.timeLeft <= 3) {
    DOM.bar.classList.add('danger');
  }
  if (STATE.timeLeft <= 0) {
    clearInterval(STATE.timer);
    handleTimesUp();
  }
}


/* SECTION 8 — ANSWER CHECKING */
function check() {
  // Ignore if already answered or input is empty
  if (STATE.answered) return;
  const input = DOM.answer.value.trim().toLowerCase();
  if (!input) return;

  const q       = STATE.shuffled[STATE.qi];
  const isRight = q.answers.some(a => a.toLowerCase() === input);

  if (isRight) {
    handleCorrect(q.pts);
  } else {
    handleWrong();
  }
}

/*Awards points to the active team, plays effects*/
function handleCorrect(points) {
  STATE.answered = true;
  clearInterval(STATE.timer);

  STATE.scores[STATE.activeTeam] += points;
  DOM.scoreA.textContent = STATE.scores.a;
  DOM.scoreB.textContent = STATE.scores.b;

  DOM.feedback.className   = 'feedback correct';
  DOM.feedback.textContent = '✓ Correct!';

  DOM.qcard.classList.add('flash-correct');
  DOM.submitBtn.classList.add('fading');
  showToast(`+${points} Points`);
  spawnConfetti();

  // Switch team → load next question
  setTimeout(() => {
    DOM.qcard.classList.remove('flash-correct');
    STATE.qi++;
    switchTeam();
    loadQuestion();
  }, 900);
}

function handleWrong() {
  STATE.answered = true;
  clearInterval(STATE.timer);

  DOM.feedback.className   = 'feedback wrong';
  DOM.feedback.textContent = '✗ Wrong — turn over!';

  DOM.inputRow.classList.add('wrong-border');
  DOM.qcard.classList.add('flash-wrong');
  DOM.submitBtn.classList.add('fading');

  // Switch team → load next question after flash
  setTimeout(() => {
    DOM.qcard.classList.remove('flash-wrong');
    DOM.inputRow.classList.remove('wrong-border');
    STATE.qi++;
    switchTeam();
    loadQuestion();
  }, 900);
}

function handleTimesUp() {
  if (STATE.answered) return; // already handled (edge case)
  STATE.answered = true;

  DOM.feedback.className   = 'feedback skipped';
  DOM.feedback.textContent = "⏰ Time's up — no points!";

  DOM.qcard.classList.add('times-up');
  DOM.submitBtn.classList.add('fading');

  setTimeout(() => {
    DOM.qcard.classList.remove('times-up');
    STATE.qi++;
    switchTeam();
    loadQuestion();
  }, 1000);
}

DOM.answer.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') check();
});


/* SECTION 9 — HINT SYSTEM */
/* AI INTEGRATION: hint text comes from q.hint in the question object.*/
function openHint() {
  if (STATE.hintsUsed >= 3 || STATE.answered) return;

  STATE.hintsUsed++;
  DOM.hcount.textContent = STATE.hintsUsed;

  if (STATE.hintsUsed >= 3) {
    DOM.hintBtn.classList.add('used');
  }

  const q = STATE.shuffled[STATE.qi];
  DOM.hintText.textContent = q.hint;
  DOM.overlay.classList.add('open');
}

function closeHint(event) {
  if (event && event.target !== DOM.overlay) return;
  DOM.overlay.classList.remove('open');
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
    const piece = document.createElement('div');
    piece.className = 'cp';
    piece.style.left              = Math.random() * 100 + '%';
    piece.style.background        = COLORS[Math.floor(Math.random() * COLORS.length)];
    piece.style.animationDuration = (.6 + Math.random() * .9) + 's';
    piece.style.animationDelay    = (Math.random() * .4) + 's';
    piece.style.transform         = `rotate(${Math.random() * 360}deg)`;
    DOM.cwrap.appendChild(piece);
    setTimeout(() => piece.remove(), 1800);
  }
}


/*SECTION 11 — UTILITIES */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


/* AI INTEGRATION — FUTURE FUNCTIONS SCAFFOLD
   When ready to connect the AI model, implement these:
   async function fetchQuestionsFromAI(count = 10) {
     const response = await fetch('/api/generate-questions', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ count, topic: 'technology' })
     });
     const data = await response.json();
     // Expected: array of { p1, p2, answers, hint, pts }
     return data.questions;
   }

   // Also update init() to:
   async function init() {
     STATE.shuffled = await fetchQuestionsFromAI(10);
     setActiveTeam('a');
     loadQuestion();
   } */