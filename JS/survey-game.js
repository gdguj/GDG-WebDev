// ================================
let game = {
    question: "جاري تحميل السؤال...",
    answers: []
};

// ================================
// استدعاء API - جلب السؤال من Backend
// ================================
async function loadQuestion() {
    try {
        const url = `http://localhost:5000/api/ai/family-feud?t=${Date.now()}`;
        console.log('⤴️ fetching question from', url);
        const response = await fetch(url, { cache: 'no-store' });

        console.log('↩️ response status', response.status);
        if (!response.ok) {
            throw new Error(`خطأ في الاتصال: ${response.status}`);
        }

        const data = await response.json();
        if (data.fallback) {
            console.warn("⚠️ يتم استخدام بيانات احتياطية ثابتة (Quota قد انتهى)");
        }
        
        // تحديث البيانات من Backend
        game.question = data.question;
        game.answers = data.answers.map(ans => ({
            text: ans.answer,  // تحويل answer إلى text
            points: ans.points,
            revealed: false
        }));
        
        console.log('✅ تم تحميل السؤال:', game);
        
        // إعادة تعيين متغيرات الجولة
        currentTeam = "أ";
        strikes = 0;
        timeLeft = 45;
        stealMode = false;
        originalTeam = null;
        
        // تحديث الواجهة
        questionEl.textContent = game.question;
        strikesEl.textContent = "";
        inputEl.value = "";
        document.getElementById("currentTeamBox").textContent = "الفريق أ";
        renderAnswers();
        inputEl.focus();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل السؤال:', error);
        game.question = "خطأ في تحميل السؤال - تأكد من أن البيئة تعمل";
        questionEl.textContent = game.question;
    }
}

// تحميل السؤال عند فتح الصفحة
window.addEventListener('load', loadQuestion);

// ================================
// متغيرات اللعبة
// ================================
let currentTeam = "أ";
let scoreA = 0;
let scoreB = 0;
let strikes = 0;
let timeLeft = 45;

let stealMode = false;
let originalTeam = null;

// ================================
// عناصر الواجهة
// ================================
const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const strikesEl = document.getElementById("strikes");
const inputEl = document.getElementById("answerInput");
const scoreAEl = document.getElementById("scoreA");
const scoreBEl = document.getElementById("scoreB");
const timerEl = document.getElementById("timer");

// ================================
// عرض الإجابات
// ================================
function renderAnswers() {
    answersEl.innerHTML = "";

    game.answers.forEach(ans => {
        const div = document.createElement("div");
        div.classList.add("answer-card");

        if (ans.revealed) {
            div.classList.add("revealed");

            const pointsEl = document.createElement("div");
            pointsEl.classList.add("points");
            pointsEl.textContent = ans.points;

            const textEl = document.createElement("div");
            textEl.classList.add("text");
            textEl.textContent = ans.text;

            div.appendChild(pointsEl);
            div.appendChild(textEl);
        }

        answersEl.appendChild(div);
    });
}

// ================================
// إرسال الإجابة
// ================================
function submitAnswer() {
    const value = inputEl.value.trim().toLowerCase();
    console.log("🔍 user input:", value);
    console.log("🔍 current answers:", game.answers.map(a => a.text));
    const normalize = str => {
        if (!str) return "";
        return String(str)
            .toLowerCase()
            // remove tashkeel (diacritics) and tatweel
            .replace(/[\u064B-\u0652\u0640]/g, "")
            // remove punctuation and non-Arabic letters/numbers
            .replace(/[^\u0600-\u06FF0-9\s]/g, "")
            // collapse whitespace
            .replace(/\s+/g, " ")
            // remove common prefix ال
            .replace(/^ال\s?/, "")
            .trim();
    };

    const found = game.answers.find(ans => {
        const answerText = normalize(ans.text);
        const userText = normalize(value);
        if (ans.revealed) return false;
        // مطابقة دقيقة فقط - يجب أن تكون الإجابة متطابقة تماماً
        return answerText === userText;
    });

    if (found) {
        console.log("✅ matched answer:", found.text, "points:", found.points);
        found.revealed = true;
        renderAnswers();

        // لو في وضع السرقة
        if (stealMode) {
            const totalPoints = game.answers
                .filter(ans => !ans.revealed)
                .reduce((sum, ans) => sum + ans.points, 0);

            if (currentTeam === "أ") {
                scoreA += totalPoints;
                scoreAEl.textContent = scoreA;
            } else {
                scoreB += totalPoints;
                scoreBEl.textContent = scoreB;
            }

            showResultPopup(
                "🎉 تمت السرقة بنجاح!",
                `الفريق ${currentTeam} حصل على ${totalPoints} نقطة`
            );

            endRound();
            return;
        }

        // الوضع الطبيعي
        if (currentTeam === "أ") {
            scoreA += found.points;
            scoreAEl.textContent = scoreA;
        } else {
            scoreB += found.points;
            scoreBEl.textContent = scoreB;
        }

        if (game.answers.every(ans => ans.revealed)) {
            showResultPopup("🏁 انتهت الجولة", "تم كشف جميع الإجابات");
            endRound();
        }

    } else {

        // فشل في السرقة
        if (stealMode) {
            showResultPopup(
                "❌ فشلت السرقة",
                `الفريق ${originalTeam} يحتفظ بالنقاط`
            );
            endRound();
            return;
        }

        // خطأ عادي
        strikes++;
        strikesEl.textContent = "❌".repeat(strikes);

        if (strikes >= 3) {
            activateStealMode();
        }
    }

    inputEl.value = "";
    inputEl.focus();
}

// ================================
// تفعيل السرقة
// ================================
function activateStealMode() {
    stealMode = true;
    originalTeam = currentTeam;

    currentTeam = currentTeam === "أ" ? "ب" : "أ";

    strikes = 0;
    strikesEl.textContent = "";

    document.getElementById("currentTeamBox").textContent =
        currentTeam === "أ"
            ? "الفريق أ (محاولة سرقة!)"
            : "الفريق ب (محاولة سرقة!)";
}

// ================================
// إنهاء الجولة (بدون إيقاف التايمر)
// ================================
function endRound() {
    console.log('--- endRound called. Scores:', { A: scoreA, B: scoreB });
    stealMode = false;
    strikes = 0;
    strikesEl.textContent = "";

    // إغلاق أي popup ظاهر
    try { closeResultPopup(); } catch (e) { }

    // عرض رسالة تحميل قصيرة للمستخدم
    questionEl.textContent = "جارٍ تحميل السؤال...";

    // إعادة تعيين الإجابات محلياً ثم اعادة العرض بصيغة مخفية
    game.answers.forEach(ans => ans.revealed = false);
    renderAnswers();

    // حمل سؤال جديد من API بعد فترة بسيطة لتتيح إغلاق الـ popup والانتقال
    setTimeout(() => {
        loadQuestion();
    }, 1000); // بعد ثانية واحدة من انتهاء الجولة
}


// ================================
// Popup احترافي
// ================================
function showResultPopup(title, message) {
    document.getElementById("resultTitle").textContent = title;
    document.getElementById("resultMessage").textContent = message;
    document.getElementById("resultPopup").style.display = "flex";
}

function closeResultPopup() {
    document.getElementById("resultPopup").style.display = "none";
}

// ================================
// التايمر (لا يتوقف أبداً)
// ================================
let timer = setInterval(() => {

    timeLeft--;
    timerEl.textContent = timeLeft;

    if (timeLeft <= 0) {

        if (!stealMode) {
            activateStealMode();
        } else {
            showResultPopup("⏰ انتهى الوقت!", "انتهت الجولة");
            endRound();
        }

        timeLeft = 45;
        timerEl.textContent = timeLeft;
    }

}, 1000);

// ================================
// Enter = Submit
// ================================
inputEl.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        submitAnswer();
    }
});