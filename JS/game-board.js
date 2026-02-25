const scores = {
  blue:  { name: 'Goats',     words: 4, pts: 16 },
  green: { name: 'Team name', words: 2,  pts: 8 }
};

function updateScoreBar() {
  document.getElementById('team-blue-name').textContent  = scores.blue.name;
  document.getElementById('team-blue-words').textContent = scores.blue.words;
  document.getElementById('team-blue-pts').textContent   = scores.blue.pts;
  document.getElementById('team-green-name').textContent  = scores.green.name;
  document.getElementById('team-green-words').textContent = scores.green.words;
  document.getElementById('team-green-pts').textContent   = scores.green.pts;
}

const HEX_SIZE = 55; //هنا حجم الخليه نفسه
const ROWS = 5;//عدد الصفوف الي بتتكون منها شبكة الخلايا
const COLS = 4;//عدد الأعمدة الي بتتكون منها شبكة الخلايا

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const hexCells = [];

const answeredCells = new Set();

let selectedLetter = null;

let currentQuestion = null;

//هذي الفنكشن عشان لو كبرت الشبكة حقت الخلايا يصير بدل ما ترجع تكرر الحروف تحط ارقام داخل الخليه
const CELL_LABELS = (() => {
  const labels = [];
  for (let i = 0; i < 26; i++) labels.push(String.fromCharCode(65 + i)); // A–Z
  const remaining = (ROWS * COLS) - 26;
  for (let i = 1; i <= remaining; i++) labels.push(String(i));           // 1، 2، 3...
  return labels;
})();

/* ================================================
   ⚙️ AI INTEGRATION
   ================================================
   هذي الدالة هي النقطة الوحيدة اللي تحتاج تعدل عليها
   لما تربط الـ AI الحقيقي.

   المطلوب من الدالة:
     - تاخذ حرف (مثل "H")
     - ترجع Promise يحتوي على:
       { question: string, answer: string }
     - الـ answer يجب أن يبدأ بنفس الحرف

   ================================================ */
async function fetchQuestionFromAI(letter) {

  // هذي بيانات و هميه بنحذفها لمن نسوي integration مع AI 
  await new Promise(r => setTimeout(r, 1000)); 

  const mockQuestions = {
    A: { question: 'What is the largest continent on Earth?',            answer: 'asia'      },
    B: { question: 'What is the capital of Brazil?',                     answer: 'brasilia'  },
    C: { question: 'What programming concept organizes code into classes?', answer: 'classes' },
    D: { question: 'What word means a structured set of data?',          answer: 'database'  },
    E: { question: 'What is the study of living organisms called?',      answer: 'ecology'   },
    F: { question: 'What protocol is used to transfer files online?',    answer: 'ftp'       },
    G: { question: 'What site hosts millions of code repositories?',     answer: 'github'    },
    H: { question: 'What language is used to structure web pages?',      answer: 'html'      },
    I: { question: "What is Apple's mobile operating system called?",    answer: 'ios'       },
    J: { question: 'What language is widely used for Android development?', answer: 'java'   },
    K: { question: 'What keyboard shortcut copies text?',                answer: 'k'         },
    L: { question: 'What Linux command lists directory contents?',       answer: 'ls'        },
    M: { question: 'What markup language formats README files?',         answer: 'markdown'  },
    N: { question: 'What runtime lets JavaScript run outside a browser?', answer: 'node'     },
    O: { question: 'What CSS property controls element layering?',       answer: 'opacity'   },
    P: { question: 'What language is famous for data science?',          answer: 'python'    },
    Q: { question: 'What word means a database search command?',         answer: 'query'     },
    R: { question: 'What does CSS stand for (first word)?',              answer: 'responsive' },
    S: { question: 'What scripting language runs in web browsers?',      answer: 'stylesheet' },
    T: { question: 'What TypeScript adds to JavaScript?',               answer: 'types'     },
    U: { question: 'What term describes a website address?',             answer: 'url'       },
    V: { question: 'What tool is used for code version control?',        answer: 'version'   },
    W: { question: 'What protocol transfers web pages?',                 answer: 'www'       },
    X: { question: 'What markup language is similar to HTML but stricter?', answer: 'xml'   },
    Y: { question: 'What JavaScript runtime environment is used for servers?', answer: 'yarn' },
    Z: { question: 'What is the act of making files smaller called?',    answer: 'zipping'  },
  };

  return mockQuestions[letter] || {
    question: `Name something related to technology that starts with "${letter}"`,
    answer: letter.toLowerCase()
  };
}


/* ================================================
   هنا بنرسم خليه وحدة وكل حالة لها لون وحدود مختلفة
   المفروض انه الحالتين الثانيه غير الطبيعيه تعتمد على الفريق الي بيلعب يعني لو الفريق الأزرق هو الي بيلعب لما يمر الماوس على الخلية تصير زرقاء و لما يجاوب صح تصير برضو زرقاء عشان تحب له و العكس لو الفريق الأخضر هو الي بيلعب
     - normal: أبيض مع حدود سوداء
     - hover: أزرق فاتح مع حدود زرقاء سميكة
     - answered: ازرق فاتح 
   states: 'normal' | 'hover' | 'answered'
   ================================================ */
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

  /* لون الخلية حسب الحالة */
  if (state === 'answered') ctx.fillStyle = '#e3f2fd';
  else if (state === 'hover') ctx.fillStyle = '#e3f2fd';
  else ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.strokeStyle = state === 'hover' ? '#2196f3' : '#000000';
  ctx.lineWidth   = state === 'hover' ? 3 : 2.5;
  ctx.stroke();

  ctx.fillStyle    = state === 'answered' ? '#aaa' : '#000000';
  ctx.font         = 'bold 16px Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
}


/* ================================================
   هنا بنرسم الشبكة كلها يعني محموعة الخلايا مع بعض
   ================================================ */
function drawHexGrid(hoveredIdx = -1) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hexCells.length = 0;

  const colSpacing = HEX_SIZE * Math.sqrt(3);
  const rowSpacing = HEX_SIZE * 1.5;
  const startX = 82;
  const startY = HEX_SIZE + 30;
  let labelIdx = 0;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {

      const offsetX = row % 2 !== 0 ? colSpacing / 2 : 0;
      const cx = startX + col * colSpacing + offsetX;
      const cy = startY + row * rowSpacing;
      const label = CELL_LABELS[labelIdx++] ?? '';
      const idx = hexCells.length;

      let state = 'normal';
      if (answeredCells.has(label)) state = 'answered';
      else if (idx === hoveredIdx) state = 'hover';

      drawHexagon(cx, cy, HEX_SIZE, label, state);
      hexCells.push({ cx, cy, label });
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
  const rect = canvas.getBoundingClientRect();
  const idx  = getCellAtPoint(e.clientX - rect.left, e.clientY - rect.top);
  drawHexGrid(idx);
  canvas.style.cursor = idx >= 0 && !answeredCells.has(hexCells[idx]?.label)
    ? 'pointer'
    : 'default';
});

canvas.addEventListener('mouseleave', () => drawHexGrid());

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const idx  = getCellAtPoint(e.clientX - rect.left, e.clientY - rect.top);
  if (idx < 0) return;

  const { label } = hexCells[idx];
  if (answeredCells.has(label)) return; // مجاوب قبل

  openQuestionScreen(label);
});


/* ================================================
   بعد ما يختار الخليه يقوم يفتح له واجهة السؤال الي خليناهاhidden في الـ CSS
   ================================================ */
async function openQuestionScreen(letter) {
  selectedLetter   = letter;
  currentQuestion  = null;

  document.getElementById('question-letter').textContent = letter;
  document.getElementById('question-text').textContent   = '';
  document.getElementById('answer-input').value          = '';
  document.getElementById('answer-input').disabled       = true;
  document.getElementById('answer-input').className      = 'answer-input';
  document.getElementById('check-icon').classList.add('hidden');
  document.getElementById('points-popup').classList.add('hidden');
  document.getElementById('points-popup').classList.remove('show');
  document.getElementById('submit-btn').disabled         = false;
  document.getElementById('loading-spinner').classList.remove('hidden');

  /*هنا بنبدل الشاشه بين شبكة الخلايا و واجهةالسؤال يعني بنخفي الواجهة حقت الخلايا و نفتح الواجهة حقت السؤال */
  document.getElementById('gameCanvas').classList.add('hidden');
  document.getElementById('question-screen').classList.remove('hidden');

  try {
    /* هنا بعد ما نسوي integration مع AI المفروض نرسل له هو الحرف بس حاليا الحرف ينرسل للبيانات الوهميه الموجوده عندنا */
    const result = await fetchQuestionFromAI(letter);
    currentQuestion = result;

    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('question-text').textContent = result.question;
    document.getElementById('answer-input').disabled     = false;
    document.getElementById('answer-input').focus();

  } catch (err) {
    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('question-text').textContent = 'Failed to load question.';
  }
}


/* ================================================
   بنشيك على الاجابه صح و لا لا و نحدث النقاط و نرجع للشبكة حقت الخلايا
     - لازم تكون الإجابة صح
     - ولازم تبدأ بنفس الحرف
   ================================================ */
function submitAnswer() {
  if (!currentQuestion) return;

  const input  = document.getElementById('answer-input').value.trim().toLowerCase();
  const answer = currentQuestion.answer.toLowerCase();
  const letter = selectedLetter.toLowerCase();

  const isCorrect = input === answer && input.startsWith(letter);

  if (isCorrect) {
    document.getElementById('answer-input').disabled = true;
    document.getElementById('submit-btn').disabled   = true;
    document.getElementById('check-icon').classList.remove('hidden');
//هنا سويتها على اساس انه الفريق الازرق هو الي قاعد يلعب و لكن بعدين لازم نشيك مين الفريق الي قاعد يلعب و نزوده النقاط و الكلمات
    scores.blue.pts   += 4;
    scores.blue.words += 1;
    updateScoreBar();

    /* أنيميشن النقاط */
    const popup = document.getElementById('points-popup');
    popup.classList.remove('hidden');
    requestAnimationFrame(() => popup.classList.add('show'));

    setTimeout(() => {
      answeredCells.add(selectedLetter);
      returnToBoard();
    }, 2000);

  } else {
    const input_el = document.getElementById('answer-input');
    input_el.classList.add('wrong');
    setTimeout(() => input_el.classList.remove('wrong'), 700);
  }
}

/* هذي سويتها عشان لو ضغط Enter الي في الكيبورد يرسل الاجابه يعني مو لازم يضغط على البوتون حق Submit */
document.getElementById('answer-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitAnswer();
});

function returnToBoard() {
  document.getElementById('question-screen').classList.add('hidden');
  document.getElementById('gameCanvas').classList.remove('hidden');
  drawHexGrid();
}

drawHexGrid();