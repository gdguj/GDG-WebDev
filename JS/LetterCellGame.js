let currentSessionId = null; // معرف الجلسة الحالية 
const urlParams = new URLSearchParams(window.location.search);
const customGameId = urlParams.get('id');

function showPopup(message) {
  // Remove existing popup if any
  const existing = document.getElementById('custom-popup-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'custom-popup-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.45);
    display:flex; align-items:center; justify-content:center;
    z-index:99999; font-family:'Cairo',sans-serif; direction:rtl;
  `;

  overlay.innerHTML = `
    <div style="
      background:#fff; border-radius:18px; padding:36px 40px;
      max-width:380px; width:90%; text-align:center;
      box-shadow:0 8px 40px rgba(0,0,0,0.18);
      animation: popupIn .25s ease;
    ">
      <div style="font-size:2.2rem; margin-bottom:12px;">⚠️</div>
      <p style="font-size:1.05rem; color:#333; font-weight:600; margin-bottom:24px; line-height:1.7;">${message}</p>
      <button id="popup-ok-btn" style="
        background:#0078BF; color:#fff; border:none;
        padding:10px 36px; border-radius:10px; font-size:1rem;
        font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;
      ">حسناً</button>
    </div>
  `;

  document.head.insertAdjacentHTML('beforeend', `
    <style>
      @keyframes popupIn { from { transform:scale(.85); opacity:0; } to { transform:scale(1); opacity:1; } }
    </style>
  `);

  document.body.appendChild(overlay);
  overlay.querySelector('#popup-ok-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

const scores = {
  blue:  { name: localStorage.getItem('blueTeamName') || 'الفريق الأزرق',     words: 0, pts: 0 },
  green: { name: localStorage.getItem('greenTeamName') || 'الفريق الأخضر', words: 0,  pts: 0 }
};

function updateScoreBar() {
  document.getElementById('team-blue-name').textContent  = scores.blue.name;
  document.getElementById('team-blue-words').textContent = scores.blue.words;
  document.getElementById('team-blue-pts').textContent   = scores.blue.pts;
  document.getElementById('team-green-name').textContent  = scores.green.name;
  document.getElementById('team-green-words').textContent = scores.green.words;
  document.getElementById('team-green-pts').textContent   = scores.green.pts;
}

const HEX_SIZE = 55;
let ROWS = 5;   // سيتم تعديلها ديناميكياً بناءً على عدد الأسئلة
let COLS = 5;   // سيتم تعديلها ديناميكياً بناءً على عدد الأسئلة

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const hexCells = [];

const answeredCells = new Map(); // letter → 'blue' | 'green'

let currentTurn = 'blue';    // الفريق الحالي اللي دوره يختار
let gameStarted  = false;    // ما تبدأ اللعبة إلا بعد العجلة

let selectedLetter = null;

let currentQuestion = null;


// هذي الفنكشن عشان نسترجع كل الاسئلة و الاجوبة من الداتا بيس 

let allQuestions = []; // هنا بنخزن الأسئلة اللي بتجينا

async function loadQuestions() {
    // try {
    //     const response = await fetch('/api/init-game', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify({
    //             gameType: "letter_cells",
    //             greenName: localStorage.getItem('greenTeamName') || 'Green Team',
    //             blueName: localStorage.getItem('blueTeamName') || 'Blue Team',
    //             timestamp: new Date().getTime()
    //         })
    //     });

    //     const data = await response.json();
    //     console.log("البيانات الكاملة من السيرفر:", data);
        
    //     if (!data.sessionId || !data.cells) {
    //         console.error("خطأ: البيانات ناقصة من السيرفر");
    //         alert(" حدث خطأ في استقبال البيانات من السيرفر");
    //         return;
    //     }

    //     currentSessionId = data.sessionId;
    //     allQuestions = data.cells;
    //     lettersArray = [];
    //     lettersArray = allQuestions.map(cell => cell.letter);
    //     drawHexGrid();
    //     updateScoreBar();
        
    // } catch (error) {
    //     console.error("❌ خطأ في جلب الأسئلة:", error);
    //     alert("❌ فشل الاتصال بالسيرفر. تأكد من أن السيرفر يعمل.");
    // }


    try {
        let response;
        let data;

        if (customGameId) {
            // الحالة الأولى: داخلين لعبة من صنع المستخدم
            console.log("Loading custom game with ID:", customGameId);
            response = await fetch(`/api/custom-games/${customGameId}`);
            const result = await response.json();
            
            if (result.success) {
                // ملاحظة: بيانات الأسئلة في السكيمّا حقتك موجودة داخل result.game.data.questions
                currentSessionId = "CUSTOM_" + result.game._id; // معرف وهمي أو حقيقي للجلسة
                allQuestions = result.game.data.questions.map(q => ({
                    letter: q.letter,
                    questionText: q.question || q.text,
                    answer: q.answer
                }));
            }
        } else {
            // الحالة الثانية: اللعبة العادية (الكود القديم حقك)
            response = await fetch('/api/init-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameType: "letter_cells",
                    greenName: localStorage.getItem('greenTeamName') || 'الفريق الأخضر',
                    blueName: localStorage.getItem('blueTeamName') || 'الفريق الأزرق',
                    timestamp: new Date().getTime()
                })
            });
            data = await response.json();
            if (data.sessionId && data.cells) {
                currentSessionId = data.sessionId;
                allQuestions = data.cells;
            }
        }

        // بعد ما تتعبأ allQuestions، نرسم الشبكة
        if (allQuestions.length > 0) {
            lettersArray = allQuestions.map(cell => cell.letter);
            drawHexGrid();
            updateScoreBar();
        } else {
            alert("لم يتم العثور على أسئلة لهذه اللعبة");
        }
        
    } catch (error) {
        console.error("❌ خطأ في تحميل الأسئلة:", error);
        alert("فشل الاتصال بالسيرفر.");
    }
}

//هنا الكود الي بينشأ رمز الانضمام 
// دالة لإنشاء اللوبي وعرض الكود للمستخدم
async function startMultiplayer() {
    if (!customGameId) {
        showPopup("رمز الانضمام يظهر فقط في الألعاب المنشأة");
        return;
    }

    try {
        const response = await fetch('/api/lobby/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: customGameId })
        });
        const result = await response.json();

        if (result.success) {
            // عرض الكود (ممكن تستخدمي SweetAlert أو المودال اللي سويناه)
            alert(`كود التحدي الخاص بك: ${result.joinCode}\nأرسله لأصدقائك الآن!`);
        }
    } catch (err) {
        alert("فشل إنشاء كود الانضمام");
    }
}



let gridLetters = new Map();// عشان نحط كل حرف  مع السؤال المقابل له 
let lettersArray = Array.from(gridLetters.keys()); // هنا بنحول خريطة الحروف إلى مصفوفة عشان نقدر نستخدمها في رسم الخلايا
let letterIndex = 0; // هذا المتغير بيستخدم عشان نحدد أي حرف نرسم في كل خلية، بنزوده بعد ما نرسم كل خلية عشان يروح للحرف اللي بعده في المصفوفة

function drawHexagon(cx, cy, size, label, state = 'normal') {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

      if (state === 'answered') {
        const teamColor = answeredCells.get(label);
        ctx.fillStyle = teamColor === null ? '#e0e0e0'
          : teamColor === 'green' ? '#c8e6c9' : '#bbdefb';
      } else if (state === 'hover') ctx.fillStyle = '#e3f2fd';
      else ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.strokeStyle = state === 'hover' ? '#2196f3'
        : state === 'answered'
          ? (answeredCells.get(label) === null ? '#aaa'
            : answeredCells.get(label) === 'green' ? '#34A853' : '#4285F4')
          : '#000000';
      ctx.lineWidth   = (state === 'hover' || state === 'answered') ? 3 : 2.5;
  ctx.stroke();

  ctx.fillStyle    = state === 'answered'
    ? (answeredCells.get(label) === null ? '#888' : (answeredCells.get(label) === 'green' ? '#2e7d32' : '#1a56db'))
    : '#000000';
  ctx.font         = 'bold 32px Cairo, Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);

}

function drawLetterInsideHex(ctx, x, y, letter) {
  ctx.fillStyle    = '#000000';
  ctx.font         = 'bold 30px Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, x, y);
}

function drawHexGrid(hoveredIdx = -1) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hexCells.length = 0;

  const colSpacing = HEX_SIZE * Math.sqrt(3);
  const rowSpacing = HEX_SIZE * 1.5;
  const startX = 60;
  const startY = HEX_SIZE + 30;
  
  let labelIdx = 0;

  // ROWS و COLS خليهم 5 عشان تظل الشبكة 25 خلية
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const offsetX = row % 2 !== 0 ? colSpacing / 2 : 0;
      const cx = startX + col * colSpacing + offsetX;
      const cy = startY + row * rowSpacing;

      // سحب الحرف من المصفوفة اللي جت من الباك إند
      // إذا خلصت الحروف (idx > 2) بياخذ نص فاضي
      const label = lettersArray[labelIdx] || ""; 
      
      const idx = hexCells.length;
      let state = 'normal';
      
      if (label !== "" && answeredCells.has(label)) state = 'answered';
      else if (idx === hoveredIdx) state = 'hover';

      // نرسم السداسي دائماً (عشان يحافظ على شكل الشبكة)
      drawHexagon(cx, cy, HEX_SIZE, label, state);
      
      // نضيف الخلية للمصفوفة فقط إذا كان لها حرف (عشان ما تفتح شاشة سؤال فاضية)
      hexCells.push({ cx, cy, label });
      
      labelIdx++; 
    }
  }
}

/* ================================================
   كشف الخلية من إحداثيات الماوس يعني لما يمر الماوس على الخلية يحدد أي خلية بالضبط
   ================================================ */
function getHexVertices(cx, cy, size) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 90);
    return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
  });
}

function pointInHex(px, py, cx, cy, size) {
  const pts = getHexVertices(cx, cy, size);
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    if (((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function getCellAtPoint(px, py) {
  for (let i = 0; i < hexCells.length; i++) {
    const { cx, cy } = hexCells[i];
    if (pointInHex(px, py, cx, cy, HEX_SIZE)) return i;
  }
  return -1;
}

canvas.addEventListener('mousemove', (e) => {
  if (!gameStarted) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const idx  = getCellAtPoint((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  drawHexGrid(idx);
  canvas.style.cursor = idx >= 0 && !answeredCells.has(hexCells[idx]?.label)
    ? 'pointer'
    : 'default';
});

canvas.addEventListener('mouseleave', () => drawHexGrid());

canvas.addEventListener('click', (e) => {
  if (!gameStarted) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const idx  = getCellAtPoint((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  if (idx < 0) return;

  const { label } = hexCells[idx];
  if (answeredCells.has(label)) return; // مجاوب قبل

  openQuestionScreen(label);
});


/* ================================================
   بعد ما يختار الخليه يقوم يفتح له واجهة السؤال الي خليناهاhidden في الـ CSS
   ================================================ */
async function openQuestionScreen(letter) {
  selectedLetter  = letter;
  currentQuestion = null;

  // reset UI
  document.getElementById('question-letter').textContent = letter;
  document.getElementById('question-text').textContent   = '';
  document.getElementById('loading-spinner').classList.remove('hidden');
  document.getElementById('points-popup').classList.add('hidden');
  document.getElementById('points-popup').classList.remove('show');
  document.getElementById('correct-answer-reveal').classList.add('hidden');

  // reset both team inputs
  ['blue','green'].forEach(t => {
    const input  = document.getElementById(`answer-${t}`);
    const btn    = document.getElementById(`submit-${t}`);
    const status = document.getElementById(`${t}-status`);
    const box    = document.getElementById(`${t}-answer-box`);
    input.value     = '';
    input.disabled  = true;
    btn.disabled    = false;
    status.textContent = '';
    status.className   = 'team-answer-status';
    box.className      = `team-answer-box ${t}-box`;
  });

  // update label names
  document.getElementById('blue-answer-label').textContent  = scores.blue.name;
  document.getElementById('green-answer-label').textContent = scores.green.name;

  document.getElementById('gameCanvas').classList.add('hidden');
  document.getElementById('question-screen').classList.remove('hidden');
  document.getElementById('navbar').classList.remove('hidden');

  try {
    const result = allQuestions.find(cell => cell.letter === letter);
    if (!result || !result.questionText) throw new Error('السؤال غير موجود');
    currentQuestion = result;

    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('question-text').textContent = result.questionText;

    startCountdown(() => {
      document.getElementById('answer-blue').disabled  = false;
      document.getElementById('answer-green').disabled = false;
      startGlobalTimer();
    });

  } catch (err) {
    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('question-text').textContent = err.message;
    setTimeout(() => returnToBoard(), 2000);
  }
}

// حالة الإجابات
const teamAnswered = { blue: false, green: false };

let timeLeft;
let timerId = null;

function startCountdown(onComplete) {
    const overlay = document.getElementById('countdown-overlay');
    let count = 3;
    overlay.innerHTML = `<span class="countdown-number">${count}</span>`;
    overlay.classList.remove('hidden');

    const countId = setInterval(() => {
        count--;
        if (count <= 0) {
            clearInterval(countId);
            overlay.classList.add('hidden');
            onComplete();
        } else {
            overlay.innerHTML = `<span class="countdown-number">${count}</span>`;
        }
    }, 1000);
}

function startGlobalTimer() {
    timeLeft = 10;
    teamAnswered.blue  = false;
    teamAnswered.green = false;
    clearInterval(timerId);

    const fill = document.getElementById('timerFill');
    fill.style.width = '100%';
    document.getElementById('Time').textContent = ': 10';

    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('Time').textContent = `: ${timeLeft}`;
        fill.style.width = `${(timeLeft / 10) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(timerId);
            endRoundNoWinner();
        }
    }, 1000);
}

async function submitTeamAnswer(team) {
    if (teamAnswered[team]) return;
    const input  = document.getElementById(`answer-${team}`);
    const btn    = document.getElementById(`submit-${team}`);
    const status = document.getElementById(`${team}-status`);
    const box    = document.getElementById(`${team}-answer-box`);
    const answer = input.value.trim();

    if (!answer) { input.focus(); return; }

    teamAnswered[team] = true;
    input.disabled = true;
    btn.disabled   = true;

    // مقارنة محلية مع الإجابة
    const correct = currentQuestion?.answer
        ? answer.trim() === currentQuestion.answer.trim()
        : false;

    if (correct) {
        clearInterval(timerId);
        status.textContent = '✓ إجابة صحيحة!';
        status.className   = 'team-answer-status status-correct';
        box.classList.add('answered-correct');

        // أوقف الفريق الآخر
        const other = team === 'blue' ? 'green' : 'blue';
        document.getElementById(`answer-${other}`).disabled = true;
        document.getElementById(`submit-${other}`).disabled = true;

        // نقاط
        scores[team].pts   += 4;
        scores[team].words += 1;
        updateScoreBar();
        answeredCells.set(selectedLetter, team);
        currentTurn = team;

        const popup = document.getElementById('points-popup');
        popup.classList.remove('hidden');
        requestAnimationFrame(() => popup.classList.add('show'));

        setTimeout(() => returnToBoard(), 2000);

    } else {
        status.textContent = '✗ إجابة خاطئة';
        status.className   = 'team-answer-status status-wrong';
        box.classList.add('answered-wrong');

        // لو كلا الفريقين أجابا وكلاهم خطأ
        if (teamAnswered.blue && teamAnswered.green) {
            clearInterval(timerId);
            endRoundNoWinner();
        }
    }
}

function endRoundNoWinner() {
    // أوقف كل الإدخالات
    ['blue','green'].forEach(t => {
        document.getElementById(`answer-${t}`).disabled = true;
        document.getElementById(`submit-${t}`).disabled = true;
    });

    // أظهر الإجابة الصحيحة
    if (currentQuestion?.answer) {
        document.getElementById('correct-answer-text').textContent = currentQuestion.answer;
        document.getElementById('correct-answer-reveal').classList.remove('hidden');
    }

    answeredCells.set(selectedLetter, null); // خلية رمادية
    currentTurn = currentTurn === 'blue' ? 'green' : 'blue';

    setTimeout(() => returnToBoard(), 2500);
}

// Enter key لكل input
document.getElementById('answer-blue').addEventListener('keydown',  e => { if (e.key === 'Enter') submitTeamAnswer('blue'); });
document.getElementById('answer-green').addEventListener('keydown', e => { if (e.key === 'Enter') submitTeamAnswer('green'); });

function returnToBoard() {
  document.getElementById('question-screen').classList.add('hidden');
  document.getElementById('navbar').classList.add('hidden');
  document.getElementById('gameCanvas').classList.remove('hidden');
  clearInterval(timerId);
  updateTurnIndicator();
  drawHexGrid();
}

drawHexGrid();
loadQuestions();
document.getElementById('navbar').classList.add('hidden');
initWheel();

/* ================================================
   دالة مؤشر الدور
   ================================================ */
function updateTurnIndicator() {
  const indicator = document.getElementById('turn-indicator');
  const text      = document.getElementById('turn-text');
  if (!indicator || !gameStarted) return;
  const teamName = scores[currentTurn]?.name || (currentTurn === 'blue' ? 'الفريق الأزرق' : 'الفريق الأخضر');
  text.textContent = `🎯 دور ${teamName} لاختيار حرف`;
  indicator.className = 'turn-indicator ' + (currentTurn === 'blue' ? 'blue-turn' : 'green-turn');
  indicator.classList.remove('hidden');
}

/* ================================================
   Winner Popup
   ================================================ */
let pendingCorrectAnswer = false;

function showWinnerPopup(isCorrect) {
  pendingCorrectAnswer = isCorrect;
  const overlay = document.getElementById('winner-popup-overlay');
  document.getElementById('winner-popup-title').textContent =
    isCorrect ? '🎉 إجابة صحيحة! من كان أسرع؟' : '⏰ من أجاب؟';
  document.getElementById('winner-blue-btn').textContent  = scores.blue.name;
  document.getElementById('winner-green-btn').textContent = scores.green.name;
  overlay.classList.remove('hidden');
}

function handleWinnerChoice(team) {
  document.getElementById('winner-popup-overlay').classList.add('hidden');
  clearInterval(timerId);

  if (team && pendingCorrectAnswer) {
    scores[team].pts   += 4;
    scores[team].words += 1;
    updateScoreBar();
    answeredCells.set(selectedLetter, team);
    currentTurn = team; // الفائز يختار الحرف التالي
  } else {
    // لم يجب أحد أو إجابة خاطئة → الدور للفريق الآخر
    currentTurn = currentTurn === 'blue' ? 'green' : 'blue';
  }

  returnToBoard();
}

/* ================================================
   Wheel Logic
   ================================================ */
let wheelAngle  = 0;
let isSpinning  = false;
let wheelResult = null;

function initWheel() {
  const wc = document.getElementById('wheelCanvas');
  if (!wc) return;
  drawWheel(0);
}

function drawWheel(angle) {
  const wc  = document.getElementById('wheelCanvas');
  if (!wc) return;
  const wctx = wc.getContext('2d');
  const cx   = wc.width  / 2;
  const cy   = wc.height / 2;
  const r    = Math.min(cx, cy) - 18;

  wctx.clearRect(0, 0, wc.width, wc.height);

  const bName = scores.blue.name;
  const gName = scores.green.name;

  // Blue section
  wctx.beginPath();
  wctx.moveTo(cx, cy);
  wctx.arc(cx, cy, r, angle, angle + Math.PI);
  wctx.closePath();
  wctx.fillStyle = '#4285F4';
  wctx.fill();

  // Green section
  wctx.beginPath();
  wctx.moveTo(cx, cy);
  wctx.arc(cx, cy, r, angle + Math.PI, angle + Math.PI * 2);
  wctx.closePath();
  wctx.fillStyle = '#34A853';
  wctx.fill();

  // Border
  wctx.beginPath();
  wctx.arc(cx, cy, r, 0, Math.PI * 2);
  wctx.strokeStyle = '#fff';
  wctx.lineWidth = 4;
  wctx.stroke();

  // Divider line
  wctx.beginPath();
  wctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  wctx.lineTo(cx - Math.cos(angle) * r, cy - Math.sin(angle) * r);
  wctx.strokeStyle = '#fff';
  wctx.lineWidth = 4;
  wctx.stroke();

  // Labels
  wctx.fillStyle = '#fff';
  wctx.font = 'bold 15px Cairo, Arial';
  wctx.textAlign = 'center';
  wctx.textBaseline = 'middle';
  const blueA  = angle + Math.PI / 2;
  const greenA = angle + Math.PI * 3 / 2;
  wctx.fillText(bName, cx + Math.cos(blueA)  * r * 0.6, cy + Math.sin(blueA)  * r * 0.6);
  wctx.fillText(gName, cx + Math.cos(greenA) * r * 0.6, cy + Math.sin(greenA) * r * 0.6);

  // Center circle
  wctx.beginPath();
  wctx.arc(cx, cy, 12, 0, Math.PI * 2);
  wctx.fillStyle = '#fff';
  wctx.fill();
}

function spinWheel() {
  if (isSpinning) return;
  isSpinning = true;
  document.getElementById('spin-btn').disabled = true;

  const totalRot  = (6 + Math.random() * 6) * Math.PI * 2;
  const startAngle = wheelAngle;
  const endAngle   = startAngle + totalRot;
  const duration   = 3500;
  const startTime  = performance.now();

  function animate(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 4);
    wheelAngle = startAngle + (endAngle - startAngle) * eased;
    drawWheel(wheelAngle);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // تحديد الفائز: المؤشر في الأعلى = -PI/2
      const pointerInWheel = ((-Math.PI / 2 - wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      wheelResult = pointerInWheel < Math.PI ? 'blue' : 'green';
      isSpinning  = false;

      const winnerName = wheelResult === 'blue' ? scores.blue.name : scores.green.name;
      const resultEl   = document.getElementById('spin-result-text');
      resultEl.textContent = `🎉 يبدأ: ${winnerName}!`;
      resultEl.style.color = wheelResult === 'blue' ? '#4285F4' : '#34A853';
      document.getElementById('start-game-btn').classList.remove('hidden');
    }
  }
  requestAnimationFrame(animate);
}

function startGame() {
  currentTurn = wheelResult || 'blue';
  gameStarted  = true;
  document.getElementById('wheel-overlay').style.display = 'none';
  updateTurnIndicator();
}