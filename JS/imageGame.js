/* 
   SECTION 1 — QUESTIONS
   ─────────────────────────────────────────
   كل سؤال:
     p1, p2   : مسار الصورة نسبي من مكان الـ HTML
     answers  : الإجابات المقبولة (lowercase)
     pts      : النقاط عند الإجابة الصحيحة
 */
const QUESTIONS = [
  {
    p1: "../Images/imageGamePics/pic1-1.png",
    p2: "../images/imageGamePics/pic1-2.png",
    answers: ["كشري"],
    hint:"اكله مصرية",
    pts: 4
  },
  {
    p1: "../Images/imageGamePics/pic2-2.png",
    p2: "../images/imageGamePics/pic2-1.png",
    answers: ["برجر"],
    hint:"وجبة سريعة",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic3-2.png",
    p2: "../images/imageGamePics/pic3-1.png",
    answers: ["سردين"],
    hint:"سمك صغير ",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic4-1.png",
    p2: "../images/imageGamePics/pic4-2.png",
    answers: ["بطريق"],
    hint:"حيوان يعيش في القطب الجنوبي",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic5-1.png",
    p2: "../images/imageGamePics/pic5-2.png",
    answers: ["دحدر"],
    hint:" توكل",
    pts: 4
  },
   {
    p1: "../Images/imageGamePics/pic6-2.png",
    p2: "../images/imageGamePics/pic6-1.png",
    answers: ["برعصي"],
    hint:"حيوان زاحف",
    pts: 4
  },
  {
    p1: "../Images/imageGamePics/pic7-1.png",
    p2: "../images/imageGamePics/pic7-2.png",
    answers: ["ام القرى","أم القرى"],
    hint:"مدينة في السعودية",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic8-2.png",
    p2: "../images/imageGamePics/pic8-1.png",
    answers: ["طبرجل"],
    hint:"معروفة بالشعب الي يمشي",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic9.png",
    p2: "../images/imageGamePics/pic9.png",
    answers: ["بيكان"],
    hint:"نوع من المكسرات",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic10-2.png",
    p2: "../images/imageGamePics/pic10-1.png",
    answers: ["حكماء"],
    hint:"عقول كبيرة",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic11-2.png",
    p2: "../images/imageGamePics/pic11-1.png",
    answers: ["فيتنام"],
    hint:"دولة ",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic12-2.png",
    p2: "../images/imageGamePics/pic12-1.png",
    answers: ["بروتين"],
    hint:"تقوية العضلات",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic13-2.png",
    p2: "../images/imageGamePics/pic13-1.png",
    answers: ["تويكس"],
    hint:"شوكولاته",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic14-2.png",
    p2: "../images/imageGamePics/pic14-1.png",
    answers: ["ليمون"],
    hint:"فاكهة حامضة",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic15-2.png",
    p2: "../images/imageGamePics/pic15-1.png",
    answers: ["قصدير"],
    hint:"تغليف",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic16-2.png",
    p2: "../images/imageGamePics/pic16-1.png",
    answers: ["طعمية"],
    hint:"أكلة مصرية شعبية",
    pts: 4
  },
   {
    p1: "../images/imageGamePics/pic17-2.png",
    p2: "../images/imageGamePics/pic17-1.png",
    answers: ["شاورما"],
    hint:"",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic18-2.png",
    p2: "../images/imageGamePics/pic18-1.png",
    answers: ["مركبة"],
    hint:"وسيلة نقل",
    pts: 4
  },
  
  {
    p1: "../images/imageGamePics/pic19-2.png",
    p2: "../images/imageGamePics/pic19-1.png",
    answers: ["جامعة الاميرات","جامعة الاميرة نورة"],
    hint:"تغليف",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic20-1.png",
    p2: "../images/imageGamePics/pic20-2.png",
    answers: ["قطايف"],
    hint:"أكلة شعبية في رمضان",
    pts: 4
  },
   {
    p1: "../images/imageGamePics/pic21-2.png",
    p2: "../images/imageGamePics/pic21-1.png",
    answers: ["سنووايت"],
    hint:"اميرة ديزني",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic22-2.png",
    p2: "../images/imageGamePics/pic22-1.png",
    answers: ["صندوق"],
    hint:"تخزين",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic23-2.png",
    p2: "../images/imageGamePics/pic23-1.png",
    answers: ["صومال"],
    hint:"دولة في أفريقيا",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic24-2.png",
    p2: "../images/imageGamePics/pic24-1.png",
    answers: ["ابها"],
    hint:"مدينة في السعودية",
    pts: 4
  },
    {
    p1: "../images/imageGamePics/pic25-2.png",
    p2: "../images/imageGamePics/pic25-1.png",
    answers: ["زورق"],
    hint:"وسيلة نقل مائية",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic26-2.png",
    p2: "../images/imageGamePics/pic26-1.png",
    answers: ["انانس"],
    hint:"فاكهة استوائية",
    pts: 4
  },
  {
    p1: "../images/imageGamePics/pic27-2.png",
    p2: "../images/imageGamePics/pic27-1.png",
    answers: ["كأس العالم","كاس العالم"],
    hint:"بطولة عالمية",
    pts: 4
  },
];


const GAME_TIME = 120;


/* SECTION 2 — STATE */
const STATE = {
  scores:     { a: 0, b: 0 }, // نقاط كل فريق
  activeTeam: 'a',             // الفريق النشط حالياً
  qi:         0,               // رقم السؤال الحالي
  shuffled:   [],              // الأسئلة بعد الخلط
  hintsUsed: false,
  timeLeft: GAME_TIME,
  timer: null,
  answered: false,
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
  toast:       document.getElementById('toast'),
  cwrap:       document.getElementById('cwrap'),
  scoreA:      document.getElementById('score-a'),
  scoreB:      document.getElementById('score-b'),
  teamACard:   document.getElementById('team-a-card'),
  teamBCard:   document.getElementById('team-b-card'),
  activeBadge: document.getElementById('active-team-badge'),
  bar: document.getElementById('bar'),
hintBtn: document.getElementById('hint-btn'),
overlay: document.getElementById('overlay'),
hintText: document.getElementById('hint-text'),
};


/* SECTION 4 — INIT */
function init() {
  STATE.shuffled = shuffle([...QUESTIONS]);
  setActiveTeam('a');
  loadQuestion();
}

init();


/* SECTION 5 — TEAM MANAGEMENT */
// يغيّر الفريق النشط ويحدّث الـ UI
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


/* SECTION 6 — LOAD QUESTION */
function loadQuestion() {
  if (STATE.qi >= STATE.shuffled.length) {
    showGameOver();
    return;
  }

  const q = STATE.shuffled[STATE.qi];

  DOM.pic1.src = q.p1;
  DOM.pic2.src = q.p2;

  // تنظيف الحقل والـ feedback
  DOM.answer.value         = '';
  DOM.feedback.className   = 'feedback';
  DOM.feedback.textContent = '';
  DOM.inputRow.classList.remove('wrong-border');
  DOM.submitBtn.classList.remove('fading');
  DOM.answer.focus();
  STATE.hintsUsed = false;
DOM.hintBtn.classList.remove('used');
STATE.answered = false;
resetTimer();
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


/* SECTION 7 — ANSWER CHECKING */
function check() {
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

// صح: أضف نقاط + انتقل
function handleCorrect(points) {
  STATE.scores[STATE.activeTeam] += points;
  DOM.scoreA.textContent = STATE.scores.a;
  DOM.scoreB.textContent = STATE.scores.b;

  DOM.feedback.className   = 'feedback correct';
  DOM.feedback.textContent = '✓ Correct!';
  DOM.qcard.classList.add('flash-correct');
  DOM.submitBtn.classList.add('fading');

  showToast(`+${points} Points`);
  spawnConfetti();

  setTimeout(() => {
    DOM.qcard.classList.remove('flash-correct');
    STATE.qi++;
    switchTeam();
    loadQuestion();
  }, 900);
}

// غلط: بدون نقاط + انتقل
function handleWrong() {
  DOM.feedback.className   = 'feedback wrong';
  DOM.feedback.textContent = '✗ Wrong!';
  DOM.inputRow.classList.add('wrong-border');
  DOM.qcard.classList.add('flash-wrong');
  DOM.submitBtn.classList.add('fading');

  setTimeout(() => {
    DOM.qcard.classList.remove('flash-wrong');
    DOM.inputRow.classList.remove('wrong-border');
    STATE.qi++;
    switchTeam();
    loadQuestion();
  }, 900);
}

DOM.answer.addEventListener('keydown', e => {
  if (e.key === 'Enter') check();
});


/* SECTION 8 — GAME OVER */
function showGameOver() {
  console.log('Game Over — Scores:', STATE.scores);
}


/* SECTION 9 — VISUAL EFFECTS */
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


/* SECTION 10 — UTILS */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}