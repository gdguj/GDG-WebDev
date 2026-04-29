let currentSessionId = null; // معرف الجلسة الحالية 
const urlParams = new URLSearchParams(window.location.search);
const customGameId = urlParams.get('id');

const scores = {
  blue:  { name: localStorage.getItem('blueTeamName') || 'Blue Team',     words: 0, pts: 0 },
  green: { name: localStorage.getItem('greenTeamName') || 'Green Team', words: 0,  pts: 0 }
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

const answeredCells = new Set();

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
                    greenName: localStorage.getItem('greenTeamName') || 'Green Team',
                    blueName: localStorage.getItem('blueTeamName') || 'Blue Team',
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
        alert("عذراً، خاصية التحدي متاحة فقط للألعاب المنشأة");
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
  console.log(`\nفتح شاشة السؤال للحرف: "${letter}"`);
  
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

  document.getElementById('gameCanvas').classList.add('hidden');
  document.getElementById('question-screen').classList.remove('hidden');

  try {
    // البحث عن السؤال في allQuestions
    console.log(` البحث عن السؤال للحرف "${letter}" في ${allQuestions.length} سؤال`);
    
    const result = allQuestions.find(cell => cell.letter === letter);
    
    if (!result) {
      throw new Error(`السؤال للحرف "${letter}" غير موجود في allQuestions`);
    }

    if (!result.questionText) {
      console.warn(` questionText فارغ:`, result);
      throw new Error(`نص السؤال للحرف "${letter}" فارغ`);
    }

    currentQuestion = result;

    console.log(`تم تحميل السؤال:`, {
      letter: result.letter,
      question: result.questionText,
      hasAnswer: !!result.answer
    });

    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('question-text').textContent = result.questionText;
    
    startGlobalTimer();
    document.getElementById('answer-input').disabled     = false;
    document.getElementById('answer-input').focus();

  } catch (err) {
    console.error(" خطأ في تحميل السؤال:", err);
    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('question-text').textContent = `${err.message}`;
    document.getElementById('submit-btn').disabled = true;
    
    // العودة للشبكة بعد 2 ثانية
    setTimeout(() => returnToBoard(), 2000);
  }
}

let timeLeft ;
let timerId = null;

function startGlobalTimer() {
    timeLeft = 10;
    clearInterval(timerId); // نحتاج هنا كود يمسح أي عداد قديم عشان ما تتداخل الأوقات
    
    timerId = setInterval(() => {
        //  ننقص الوقت بمقدار 1
        timeLeft--;
        //  نحدث نص العنصر في HTML اللي يعرض الوقت المتبقي
        document.getElementById('Time').textContent = `: ${timeLeft}`;
        
        if (timeLeft <= 0) {
            //  نوقف العداد تماماً
            clearInterval(timerId);
            //  ننادي دالة تنهي الجولة وترجع للشبكة
            returnToBoard();
            //  نعرض رسالة انتهاء الوقت
            alert("انتهى الوقت! لم يربح أحد");
        }
    }, 1000);
}
async function submitAnswer() {
    const input = document.getElementById('answer-input').value.trim();
    const playerName = localStorage.getItem('playerName') || 'Unknown Player'; 
    const playerTeam = localStorage.getItem('playerTeam') || 'blue';
    
    console.log(`\n DEBUG submitAnswer:`);
    console.log(`  - Input: "${input}"`);
    console.log(`  - PlayerName: "${playerName}"`);
    console.log(`  - PlayerTeam: "${playerTeam}"`);
    console.log(`  - SelectedLetter: "${selectedLetter}"`);
    console.log(`  - SessionID: "${currentSessionId}"`);
    
    if (!input) {
        alert("الرجاء إدخال إجابة");
        return;
    }

    if (!currentSessionId || !selectedLetter) {
        console.error(" خطأ: معرف الجلسة أو الحرف غير موجود");
        alert(" حدث خطأ في البيانات. حاول مرة أخرى.");
        return;
    }

    // منع الضغط على الزر مرتين
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn.disabled) {
        console.warn("الزر معطل - محاولة ضغط مضاعفة");
        return;
    }
    submitBtn.disabled = true;

    // إيقاف التايمر
    clearInterval(timerId); 

    try {
        const requestBody = {
            sessionId: currentSessionId,
            team: playerTeam,
            answer: input,
            letter: selectedLetter,
            playerName: playerName
        };

        console.log("إرسال الطلب إلى السيرفر:", requestBody);

        const response = await fetch('/api/answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();
        console.log(` الرد من السيرفر (Status: ${response.status}):`, result);

        if (!response.ok) {
            // خطأ من السيرفر
            console.error(" رد خطأ من السيرفر:", result.error);
            if (result.error === "already_attempted") {
                alert(" عذراً، لقد استنفدت محاولتك لهذا السؤال!");
            } else {
                alert(` خطأ: ${result.error || 'إجابة خاطئة'}`);
            }
            handleWrongAnswer();
        } else if (result.correct) {
            console.log(`إجابة صحيحة! النقاط: ${result.points}`);
            handleCorrectAnswer(playerTeam, result.points);
        } else {
            console.log("إجابة خاطئة");
            handleWrongAnswer();
        }

    } catch (error) {
        console.error(" خطأ في الاتصال بالسيرفر:", error);
        alert("فشل الاتصال بالسيرفر. تأكد من أن السيرفر يعمل.");
        handleWrongAnswer();
    } finally {
        // إعادة تفعيل الزر
        console.log(" إعادة تفعيل زر Submit");
        submitBtn.disabled = false;
    }
}

function handleCorrectAnswer(team, points) {
    document.getElementById('answer-input').disabled = true;
    document.getElementById('submit-btn').disabled   = true;
    document.getElementById('check-icon').classList.remove('hidden');

    if (scores[team]) { 
        scores[team].pts = points || (scores[team].pts + 4);  // استخدم النقاط من السيرفر
        scores[team].words += 1;
        updateScoreBar();
    }

    /* أنيميشن النقاط */
    const popup = document.getElementById('points-popup');
    popup.classList.remove('hidden');
    requestAnimationFrame(() => popup.classList.add('show'));

    clearInterval(timerId);

    setTimeout(() => {
      answeredCells.add(selectedLetter);
      returnToBoard();
    }, 2000);
}

  function handleWrongAnswer() {
    const input_el = document.getElementById('answer-input');
    input_el.classList.add('wrong');
    setTimeout(() => {
        input_el.classList.remove('wrong');
        // الرجوع للشبكة بعد 1.5 ثانية
        setTimeout(() => {
            returnToBoard();
        }, 500);
    }, 700);
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
loadQuestions(); // نبدأ بتحميل الأسئلة من السيرفر