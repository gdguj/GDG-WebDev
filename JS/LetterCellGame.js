let currentSessionId = null; // معرف الجلسة الحالية
const urlParams = new URLSearchParams(window.location.search);
const customGameId = urlParams.get('id');

// قراءة أسماء الفرق من URL (من اللوبي) وإلا localStorage
const _urlTeamA = urlParams.get('teamA');
const _urlTeamB = urlParams.get('teamB');

function showPopup(message) {
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
      ">حسنا</button>
    </div>
  `;

  document.head.insertAdjacentHTML('beforeend', `
    <style>
      @keyframes popupIn { from { transform:scale(.85); opacity:0; } to { transform:scale(1); opacity:1; } }
    </style>
  `);

  document.body.appendChild(overlay);
  overlay.querySelector('#popup-ok-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });
}

const scores = {
  blue: { name: (_urlTeamA ? decodeURIComponent(_urlTeamA) : localStorage.getItem('blueTeamName')) || 'أ', words: 0, pts: 0 },
  green: { name: (_urlTeamB ? decodeURIComponent(_urlTeamB) : localStorage.getItem('greenTeamName')) || 'ب', words: 0, pts: 0 }
};

function updateScoreBar() {
  document.getElementById('team-blue-name').textContent = scores.blue.name;
  document.getElementById('team-blue-words').textContent = scores.blue.words;
  document.getElementById('team-blue-pts').textContent = scores.blue.pts;
  document.getElementById('team-green-name').textContent = scores.green.name;
  document.getElementById('team-green-words').textContent = scores.green.words;
  document.getElementById('team-green-pts').textContent = scores.green.pts;
}

const HEX_SIZE = 55;
const BOARD_SIZE = 5;
let ROWS = 5;
let COLS = 5;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hexCells = [];

const answeredCells = new Map(); // cellKey -> 'blue' | 'green' | null

let currentTurn = 'blue';
let gameStarted = false;
let selectedLetter = null;
let selectedCellKey = null;
let currentQuestion = null;
let allQuestions = [];

// تطبيع النص العربي للمقارنة
function normalizeArabic(str) {
  return String(str || "")
    .trim()
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ءؤئ]/g, '')
    .replace(/[^\u0600-\u06FF0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^ال\s?/, '')
    .replace(/\s+ال\s?/g, ' ')
    .toLowerCase();
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
  const normalized = normalizeArabic(userInput);
  const expected = normalizeArabic(expectedAnswer);
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

function toCellKey(row, col) {
  return `${row}-${col}`;
}

function getNeighborKeys(row, col) {
  const offsets = row % 2 === 0
    ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
    : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];

  return offsets
    .map(([dRow, dCol]) => ({ row: row + dRow, col: col + dCol }))
    .filter(({ row: nextRow, col: nextCol }) => (
      nextRow >= 0 && nextRow < BOARD_SIZE && nextCol >= 0 && nextCol < BOARD_SIZE
    ))
    .map(({ row: nextRow, col: nextCol }) => toCellKey(nextRow, nextCol));
}

function hasSpanningWinningPath(team) {
  const teamKeys = new Set(
    Array.from(answeredCells.entries())
      .filter(([, owner]) => owner === team)
      .map(([key]) => key)
  );

  if (teamKeys.size < BOARD_SIZE) {
    return false;
  }

  const edgePairs = [
    {
      starts: Array.from({ length: BOARD_SIZE }, (_, col) => toCellKey(0, col)),
      ends: new Set(Array.from({ length: BOARD_SIZE }, (_, col) => toCellKey(BOARD_SIZE - 1, col))),
    },
    {
      starts: Array.from({ length: BOARD_SIZE }, (_, row) => toCellKey(row, 0)),
      ends: new Set(Array.from({ length: BOARD_SIZE }, (_, row) => toCellKey(row, BOARD_SIZE - 1))),
    },
  ];

  return edgePairs.some(({ starts, ends }) => {
    const stack = starts.filter((key) => teamKeys.has(key));
    const visited = new Set(stack);

    while (stack.length > 0) {
      const currentKey = stack.pop();
      if (ends.has(currentKey)) {
        return true;
      }

      const [row, col] = currentKey.split('-').map(Number);
      for (const neighborKey of getNeighborKeys(row, col)) {
        if (!teamKeys.has(neighborKey) || visited.has(neighborKey)) {
          continue;
        }

        visited.add(neighborKey);
        stack.push(neighborKey);
      }
    }

    return false;
  });
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
        source: 'letter_cells_custom',
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

async function goToResultsPage(team) {
  await persistScore('letter_cells', scores[team].pts, currentSessionId || `letter-local-${Date.now()}`, {
    winnerTeam: team,
    winnerName: scores[team].name,
  });

  const payload = {
    game: 'letter-cells',
    winnerTeam: team,
    winnerName: scores[team].name,
    winnerScore: scores[team].pts,
    winnerWords: scores[team].words,
    blue: { ...scores.blue },
    green: { ...scores.green },
    winningRule: 'مسار متصل من جهة إلى الجهة المقابلة',
    playedAt: Date.now()
  };

  sessionStorage.setItem('letterCellGameResult', JSON.stringify(payload));
  window.location.href = 'game-results.html';
}

function isBoardFull() {
  return answeredCells.size >= BOARD_SIZE * BOARD_SIZE;
}

function hasAnyTeamWinningPath() {
  return hasSpanningWinningPath('blue') || hasSpanningWinningPath('green');
}

let noWinnerEndingTriggered = false;

function shouldEndAsNoWinner() {
  return isBoardFull() && !hasAnyTeamWinningPath();
}

function handleBoardFullNoWinner() {
  if (noWinnerEndingTriggered || !shouldEndAsNoWinner()) {
    return false;
  }

  noWinnerEndingTriggered = true;
  gameStarted = false;
  showPopup('انتهت جميع الخلايا ولم يحقق أي فريق مسار الفوز. النتيجة: الجميع خسر.');
  setTimeout(() => goToNoWinnerResultsPage(), 1400);
  return true;
}

function goToNoWinnerResultsPage() {
  const payload = {
    game: 'letter-cells',
    winnerTeam: null,
    winnerName: 'لا يوجد فائز',
    winnerScore: 0,
    winnerWords: 0,
    blue: { ...scores.blue },
    green: { ...scores.green },
    winningRule: 'مسار متصل من جهة إلى الجهة المقابلة',
    noWinner: true,
    playedAt: Date.now()
  };

  sessionStorage.setItem('letterCellGameResult', JSON.stringify(payload));
  window.location.href = 'game-results.html';
}

async function loadQuestions() {
  try {
    let response;
    let data;

    if (customGameId) {
      response = await fetch(`/api/custom-games/${customGameId}`);
      const result = await response.json();

      if (result.success) {
        currentSessionId = 'CUSTOM_' + result.game._id;
        allQuestions = result.game.data.questions.map((question) => ({
          letter: question.letter,
          questionText: question.question || question.text,
          answer: question.answer
        }));
      }
    } else {
      // مرحلة مختارة من صفحة التعليمات
      const letterCellTemplateId = localStorage.getItem('letterCellTemplateId');
      if (letterCellTemplateId) {
        console.log('Loading letter cells template:', letterCellTemplateId);
        response = await fetch(`/api/games/templates/${encodeURIComponent(letterCellTemplateId)}`);
        const tplResult = await response.json();
        if (tplResult.success && tplResult.data) {
          const tpl = tplResult.data;
          currentSessionId = 'TEMPLATE_' + tpl._id;
          allQuestions = (tpl.data.questions || []).map((question) => ({
            letter: question.letter,
            questionText: question.question || question.text,
            answer: question.answer
          }));
          if (allQuestions.length > 0) {
            lettersArray = allQuestions.map((cell) => cell.letter);
            drawHexGrid();
            updateScoreBar();
            return;
          }
        }
      }

      response = await fetch('/api/init-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'letter_cells',
          greenName: localStorage.getItem('greenTeamName') || 'الفريق الاخضر',
          blueName: localStorage.getItem('blueTeamName') || 'الفريق الازرق',
          timestamp: new Date().getTime()
        })
      });
      data = await response.json();

      if (data.sessionId && data.cells) {
        currentSessionId = data.sessionId;
        allQuestions = data.cells;
      }
    }

    if (allQuestions.length > 0) {
      lettersArray = allQuestions.map((cell) => cell.letter);
      drawHexGrid();
      updateScoreBar();
    } else {
      showPopup('لم يتم العثور على اسئلة لهذه اللعبة');
    }
  } catch (error) {
    console.error('خطا في تحميل الاسئلة:', error);
    showPopup('فشل الاتصال بالسيرفر.');
  }
}

// عرض كود الانضمام الموجود من URL (لا ينشئ جديد)
const _lobbyJoinCode = urlParams.get('joinCode');

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('multiplayerBtn');
  if (btn && !_lobbyJoinCode) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.title = 'هذه اللعبة ليست من لوبي';
  }

  initWheel();
});

function startMultiplayer() {
  if (!_lobbyJoinCode) return;
  showPopup(`كود الانضمام: ${_lobbyJoinCode} — أرسله لأصدقائك الآن!`);
}



let gridLetters = new Map();// عشان نحط كل حرف  مع السؤال المقابل له 
let lettersArray = Array.from(gridLetters.keys()); // هنا بنحول خريطة الحروف إلى مصفوفة عشان نقدر نستخدمها في رسم الخلايا
let letterIndex = 0; // هذا المتغير بيستخدم عشان نحدد أي حرف نرسم في كل خلية، بنزوده بعد ما نرسم كل خلية عشان يروح للحرف اللي بعده في المصفوفة

function drawHexagon(cx, cy, size, label, state = 'normal', owner = null) {
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
        ctx.fillStyle = owner === null ? '#e0e0e0'
          : owner === 'green' ? '#c8e6c9' : '#bbdefb';
      } else if (state === 'hover') ctx.fillStyle = currentTurn === 'green' ? '#c8e6c9' : '#e3f2fd';
      else ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.strokeStyle = state === 'hover' ? (currentTurn === 'green' ? '#34A853' : '#2196f3')
        : state === 'answered'
          ? (owner === null ? '#aaa' : owner === 'green' ? '#34A853' : '#4285F4')
          : '#000000';
      ctx.lineWidth   = (state === 'hover' || state === 'answered') ? 3 : 2.5;
  ctx.stroke();

  ctx.fillStyle    = state === 'answered'
    ? (owner === null ? '#888' : (owner === 'green' ? '#2e7d32' : '#1a56db'))
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
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const offsetX = row % 2 !== 0 ? colSpacing / 2 : 0;
      const cx = startX + col * colSpacing + offsetX;
      const cy = startY + row * rowSpacing;
      const key = toCellKey(row, col);

      // سحب الحرف من المصفوفة اللي جت من الباك إند
      // إذا خلصت الحروف (idx > 2) بياخذ نص فاضي
      const label = lettersArray[labelIdx] || ""; 
      
      const idx = hexCells.length;
      let state = 'normal';
      
      if (label !== "" && answeredCells.has(key)) state = 'answered';
      else if (idx === hoveredIdx) state = 'hover';

      // نرسم السداسي دائماً (عشان يحافظ على شكل الشبكة)
      drawHexagon(cx, cy, HEX_SIZE, label, state, answeredCells.get(key));
      
      // نضيف الخلية للمصفوفة فقط إذا كان لها حرف (عشان ما تفتح شاشة سؤال فاضية)
      hexCells.push({ cx, cy, label, row, col, key });
      
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
  canvas.style.cursor = idx >= 0 && !answeredCells.has(hexCells[idx]?.key)
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

  const { label, key } = hexCells[idx];
  if (answeredCells.has(key)) return; // مجاوب قبل

  openQuestionScreen(label, key);
});


/* ================================================
   بعد ما يختار الخليه يقوم يفتح له واجهة السؤال الي خليناهاhidden في الـ CSS
   ================================================ */
async function openQuestionScreen(letter, cellKey) {
  selectedLetter  = letter;
  selectedCellKey = cellKey;
  currentQuestion = null;

  // reset UI
  document.getElementById('question-letter').textContent = letter;
  document.getElementById('question-text').textContent   = '';
  document.getElementById('loading-spinner').classList.remove('hidden');
  document.getElementById('points-popup').classList.add('hidden');
  document.getElementById('points-popup').classList.remove('show');
  document.getElementById('points-popup').textContent = '+ 4 نقاط';
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
      // الفريق الذي اختار الحرف يبدأ أولاً
      startPhaseTimer(currentTurn);
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
const PHASE_TIME = 15; // ثانية لكل فريق

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

// يبدأ مرحلة الـ15 ثانية للفريق المحدد
function startPhaseTimer(activeTeam) {
    teamAnswered.blue  = false;
    teamAnswered.green = false;
    clearInterval(timerId);

    const otherTeam = activeTeam === 'blue' ? 'green' : 'blue';

    // فتح فيلد الفريق النشط وإقفال الآخر
    document.getElementById(`answer-${activeTeam}`).disabled = false;
    document.getElementById(`submit-${activeTeam}`).disabled = false;
    document.getElementById(`answer-${otherTeam}`).disabled  = true;
    document.getElementById(`submit-${otherTeam}`).disabled  = true;
    document.getElementById(`answer-${activeTeam}`).focus();

    timeLeft = PHASE_TIME;
    const fill = document.getElementById('timerFill');
    fill.style.width = '100%';
    document.getElementById('Time').textContent = `: ${timeLeft}`;

    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('Time').textContent = `: ${timeLeft}`;
        fill.style.width = `${(timeLeft / PHASE_TIME) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(timerId);
            // الفريق النشط ما أجاب — انتقل للفريق الآخر إذا لم يُجِب بعد
            teamAnswered[activeTeam] = true;
            document.getElementById(`answer-${activeTeam}`).disabled = true;
            document.getElementById(`submit-${activeTeam}`).disabled = true;

            if (!teamAnswered[otherTeam]) {
                startSecondPhaseTimer(otherTeam);
            } else {
                endRoundNoWinner();
            }
        }
    }, 1000);
}

// المرحلة الثانية: الفريق الآخر يحاول
function startSecondPhaseTimer(activeTeam) {
    clearInterval(timerId);

    // أظهر تنبيه انتقال الدور
    const teamName = scores[activeTeam]?.name || (activeTeam === 'blue' ? 'الفريق الأزرق' : 'الفريق الأخضر');
    const toast = document.getElementById('phase-toast');
    toast.textContent = `⏱️ انتهى وقت الفريق الأول — دور ${teamName} الآن!`;
    toast.className = `phase-toast ${activeTeam === 'blue' ? 'toast-blue' : 'toast-green'}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);

    document.getElementById(`answer-${activeTeam}`).disabled = false;
    document.getElementById(`submit-${activeTeam}`).disabled = false;
    document.getElementById(`answer-${activeTeam}`).focus();

    timeLeft = PHASE_TIME;
    const fill = document.getElementById('timerFill');
    fill.style.width = '100%';
    document.getElementById('Time').textContent = `: ${timeLeft}`;

    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('Time').textContent = `: ${timeLeft}`;
        fill.style.width = `${(timeLeft / PHASE_TIME) * 100}%`;

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

    // مقارنة محلية مع الإجابة (مع تجاهل الفروقات الإملائية)
    const correct = currentQuestion?.answer
        ? matchAnswer(answer, currentQuestion.answer)
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
        answeredCells.set(selectedCellKey, team);
        currentTurn = team;

        const popup = document.getElementById('points-popup');
        popup.classList.remove('hidden');
        requestAnimationFrame(() => popup.classList.add('show'));

        if (hasSpanningWinningPath(team)) {
          popup.textContent = `🏆 فاز ${scores[team].name}`;
          gameStarted = false;
          setTimeout(() => goToResultsPage(team), 1400);
          return;
        }

        if (handleBoardFullNoWinner()) {
          return;
        }

        setTimeout(() => returnToBoard(), 2000);

    } else {
        status.textContent = '✗ إجابة خاطئة';
        status.className   = 'team-answer-status status-wrong';
        box.classList.add('answered-wrong');

        // أقفل فيلد هذا الفريق وانتقل للفريق الآخر إذا لم يكن قد أجاب
        clearInterval(timerId);
        document.getElementById(`answer-${team}`).disabled = true;
        document.getElementById(`submit-${team}`).disabled = true;

        const other = team === 'blue' ? 'green' : 'blue';
        if (!teamAnswered[other]) {
            startSecondPhaseTimer(other);
        } else {
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

    answeredCells.set(selectedCellKey, null); // خلية رمادية
    currentTurn = currentTurn === 'blue' ? 'green' : 'blue';

    if (handleBoardFullNoWinner()) {
      return;
    }

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

  // فحص نهائي بعد كل رجوع للوحة لضمان إنهاء اللعبة عند امتلاء الخلايا بدون فائز.
  handleBoardFullNoWinner();
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
    answeredCells.set(selectedCellKey, team);
    currentTurn = team; // الفائز يختار الحرف التالي

    if (hasSpanningWinningPath(team)) {
      gameStarted = false;
      goToResultsPage(team);
      return;
    }
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
  const wheel = document.getElementById('wheel');
  if (!wheel) return;

  wheel.style.transition = 'none';
  wheel.style.transform = 'rotate(0deg)';
  wheelAngle = 0;
  wheelResult = null;
  isSpinning = false;

  document.getElementById('wheel-blue-name').textContent = scores.blue.name;
  document.getElementById('wheel-green-name').textContent = scores.green.name;
  document.getElementById('spin-result-text').textContent = '';
  document.getElementById('spin-result-text').style.color = '#333';
  document.getElementById('spin-btn').disabled = false;
  document.getElementById('start-game-btn').classList.add('hidden');
}

function spinWheel() {
  if (isSpinning) return;
  isSpinning = true;
  const spinBtn = document.getElementById('spin-btn');
  const wheel = document.getElementById('wheel');
  spinBtn.disabled = true;
  document.getElementById('start-game-btn').classList.add('hidden');
  document.getElementById('spin-result-text').textContent = '';

  const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360;
  const landing = Math.floor(Math.random() * 359);
  const totalRotation = wheelAngle + extraSpins + landing;

  wheel.style.transition = 'transform 4000ms cubic-bezier(0.22, 1, 0.36, 1)';
  wheel.style.transform = `rotate(${totalRotation}deg)`;
  wheelAngle = totalRotation;

  setTimeout(() => {
    if (document.getElementById('wheel-overlay').style.display === 'none') {
      return;
    }

    const needle = document.querySelector('.needle');
    const needleRect = needle.getBoundingClientRect();
    const tipX = needleRect.left + needleRect.width / 2;
    const tipY = needleRect.top;

    needle.style.visibility = 'hidden';
    const elementUnderTip = document.elementFromPoint(tipX, tipY);
    needle.style.visibility = 'visible';

    let target = elementUnderTip;
    while (target && !target.classList.contains('wheel-half')) {
      target = target.parentElement;
    }

    wheelResult = target && target.dataset.team ? target.dataset.team : 'blue';
    isSpinning = false;

    const winnerName = wheelResult === 'blue' ? scores.blue.name : scores.green.name;
    const resultEl = document.getElementById('spin-result-text');
    resultEl.textContent = `يبدا: ${winnerName}`;
    resultEl.style.color = wheelResult === 'blue' ? '#4285F4' : '#34A853';
    document.getElementById('start-game-btn').classList.remove('hidden');
  }, 4100);
}

function closeWheelOverlay() {
  wheelResult = wheelResult || currentTurn || 'blue';
  startGame();
}

function startGame() {
  currentTurn = wheelResult || 'blue';
  gameStarted  = true;
  document.getElementById('wheel-overlay').style.display = 'none';
  updateTurnIndicator();
}