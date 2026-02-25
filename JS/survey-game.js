// ================================
const game = {
    question: "اذكر شيئًا يستخدم في المطبخ",
    answers: [
        { text: "سكين", points: 30, revealed: false },
        { text: "ملعقة", points: 25, revealed: false },
        { text: "قدر", points: 20, revealed: false },
        { text: "طبق", points: 18, revealed: false },
        { text: "شوكة", points: 15, revealed: false },
        { text: "كوب", points: 12, revealed: false },
        { text: "مقلاة", points: 10, revealed: false },
        { text: "خلاط", points: 8, revealed: false },
        { text: "فرن", points: 6, revealed: false },
        { text: "ثلاجة", points: 4, revealed: false }
    ]
};

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

questionEl.textContent = game.question;

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

renderAnswers();

// ================================
// إرسال الإجابة
// ================================
function submitAnswer() {
    const value = inputEl.value.trim().toLowerCase();
    const found = game.answers.find(
        ans => ans.text.toLowerCase() === value && !ans.revealed
    );

    if (found) {
        found.revealed = true;
        renderAnswers();

        // لو في وضع السرقة
        if (stealMode) {
            const totalPoints = game.answers.reduce(
                (sum, ans) => sum + ans.points,
                0
            );

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
    stealMode = false;
    strikes = 0;
    strikesEl.textContent = "";

    // إعادة تعيين الإجابات
    game.answers.forEach(ans => ans.revealed = false);
    renderAnswers();
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