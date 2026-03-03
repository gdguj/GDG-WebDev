const fs = require("fs");
const path = require("path");

const { generateFamilyFeudRawJSON } = require("../services/gemini.service");
const { validateFamilyFeud } = require("../utils/validateJSON");

// بيانات افتراضية للاستخدام عند فشل API
// الأسئلة عامة وواضحة، عدد الإجابات 10
const FALLBACK_QUESTIONS = [
  {
    question: "اذكر شيئًا يمكن أن تجده في المطبخ",
    answers: [
      { answer: "ثلاجة", points: 100 },
      { answer: "فرن", points: 90 },
      { answer: "مقلاة", points: 80 },
      { answer: "طبق", points: 70 },
      { answer: "مغسلة", points: 60 },
      { answer: "ميكروويف", points: 55 },
      { answer: "خلاط", points: 50 },
      { answer: "حوض", points: 45 },
      { answer: "سكين", points: 40 },
      { answer: "بوتاغاز", points: 35 }
    ]
  },
  {
    question: "اذكر وسيلة نقل شائعة" ,
    answers: [
      { answer: "سيارة", points: 100 },
      { answer: "دراجة", points: 85 },
      { answer: "قطار", points: 75 },
      { answer: "حافلة", points: 65 },
      { answer: "سفينة", points: 55 },
      { answer: "طائرة", points: 50 },
      { answer: "مترو", points: 45 },
      { answer: "توك توك", points: 40 },
      { answer: "سكوتر", points: 35 },
      { answer: "ترام", points: 30 }
    ]
  }
];

// helper لاختيار عنصر عشوائي من بيانات افتراضية، يتجنب الأسئلة المستخدمة إذا أمكن
function randomFallback(usedQuestions = []) {
  const available = FALLBACK_QUESTIONS.filter(q =>
    !usedQuestions.some(u => normalize(u.question) === normalize(q.question))
  );
  if (available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    return available[idx];
  }
  // إذا استُنفِدت الأسئلة، اختر أيًا منها مرة أخرى
  const idx = Math.floor(Math.random() * FALLBACK_QUESTIONS.length);
  return FALLBACK_QUESTIONS[idx];
}

// مساعدة لتحميل وحفظ الأسئلة المستخدمة
function loadUsedQuestions() {
  const file = path.join(process.cwd(), "used_questions.json");
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { }
  }
  return [];
}

function saveUsedQuestions(list) {
  const file = path.join(process.cwd(), "used_questions.json");
  fs.writeFileSync(file, JSON.stringify(list, null, 2), "utf8");
}

// normalization helper reused from validation code
function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[^\u0600-\u06FF0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^ال\s?/, "")
    .trim();
}

async function getFamilyFeud(req, res, next) {
  try {
    // 1) محاولة الحصول على سؤال من Gemini
    let data;
    let isFallback = false; // تعقب إذا استخدمنا أسئلة بديلة

    try {
      const raw = await generateFamilyFeudRawJSON();

      // 2) تحويل إلى JSON
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error("Gemini did not return valid JSON only (parsing failed).");
      }

      // 3) التحقق من صيغة البيانات
      validateFamilyFeud(data);

      // 4) حفظ ملف داخل Backend (للاستخدام في حال فشل Gemini لاحقاً)
      const outPath = path.join(process.cwd(), "family_feud_cs_ar.json");
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");

      console.log("✅ تم جلب السؤال من Gemini بنجاح");

    } catch (geminiError) {
      console.error("⚠️ خطأ من Gemini API:", geminiError.message);

      // محاولة قراءة السؤال المحفوظ السابق
      try {
        const filePath = path.join(process.cwd(), "family_feud_cs_ar.json");
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, "utf8");
          data = JSON.parse(fileContent);
          console.log("✅ تم استخدام السؤال المحفوظ السابق");
        } else {
          throw new Error("لا يوجد سؤال محفوظ");
        }
      } catch (fileError) {
        console.log("⚠️ استخدام بيانات افتراضية (Fallback)");
        data = randomFallback();
        isFallback = true;
      }
    }

    // 5) إرسال البيانات
    const payload = {
      savedTo: "family_feud_cs_ar.json",
      ...data,
      fallback: isFallback
    };

    return res.status(200).json(payload);

  } catch (err) {
    next(err);
  }
}

/**
 * ────────────────────────────────────────────────────────────────────────────────
 * NEW ENDPOINTS FOR PROPER FAMILY FEUD GAME LOGIC
 * ────────────────────────────────────────────────────────────────────────────────
 */

/**
 * POST /api/ai/family-feud/start-round
 * بدء جولة جديدة من Family Feud
 * 
 * يقوم بـ:
 * 1. توليد سؤال جديد من Gemini
 * 2. تهيئة حالة اللعبة الجديدة
 * 3. تعيين Team 1 كفريق البداية
 */
async function startFamilyFeudRound(req, res, next) {
  try {
    let questionData;
    let isFallback = false;

    // load history of used questions
    const usedQuestions = loadUsedQuestions();

    try {
      // if Gemini returns a duplicate, retry a few times
      let attempts = 0;
      while (attempts < 5) {
        const raw = await generateFamilyFeudRawJSON();
        questionData = JSON.parse(raw);
        validateFamilyFeud(questionData);

        // check for duplicate
        if (!usedQuestions.some(u => normalize(u.question) === normalize(questionData.question))) {
          break; // unique
        }

        console.log("⚠️ Gemini أعاد سؤالاً مستخدماً، إعادة المحاولة...");
        attempts++;
      }

  
      // if after retries we still have a duplicate, fall back to default
      if (usedQuestions.some(u => normalize(u.question) === normalize(questionData.question))) {
        throw new Error("Gemini returned duplicate question after retries");
      }

      // save current question (for potential debugging)
      const outPath = path.join(process.cwd(), "family_feud_current_round.json");
      fs.writeFileSync(outPath, JSON.stringify(questionData, null, 2), "utf8");

      console.log("✅ تم توليد سؤال جديد من Gemini");

  } catch (geminiError) {
  console.error("⚠️ FULL ERROR:", geminiError.message); // ADD THIS LINE HERE
  console.error("⚠️ خطأ من Gemini API أو سؤال مكرر:", geminiError.message);
  
  questionData = randomFallback(usedQuestions);
  isFallback = true;
}

    // بعد اختيار السؤال (سواء من Gemini أو fallback)، احفظه في القائمة
   // ✅ Only push if not already in the list
const alreadySaved = usedQuestions.some(u => normalize(u.question) === normalize(questionData.question));
if (!alreadySaved) {
  usedQuestions.push({ question: questionData.question, answers: questionData.answers });
  saveUsedQuestions(usedQuestions);
}



    // تهيئة حالة اللعبة الجديدة
    const roundState = {
      question: questionData.question,
      answers: questionData.answers.map(ans => ({
        answer: ans.answer,
        points: ans.points,
        revealed: false
      })),
      currentTeam: "team1",
      wrongAttempts: 0,
      roundScore: 0,
      isStealMode: false,
      originalTeam: null,
      timestamp: new Date()
    };

    const outPath = path.join(process.cwd(), "family_feud_round_state.json");
    fs.writeFileSync(outPath, JSON.stringify(roundState, null, 2), "utf8");

    return res.status(200).json({
      success: true,
      message: "تم بدء جولة جديدة",
      round: roundState,
      fallback: isFallback
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/ai/family-feud/round-state
 * الحصول على حالة الجولة الحالية
 */
function getRoundState(req, res, next) {
  try {
    const stateFile = path.join(process.cwd(), "family_feud_round_state.json");
    
    if (!fs.existsSync(stateFile)) {
      return res.status(404).json({
        success: false,
        message: "لا توجد جولة نشطة حالياً"
      });
    }

    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    return res.status(200).json(state);

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/family-feud/submit-answer
 * إرسال إجابة وتحديث حالة اللعبة
 * 
 * Body:
 * {
 *   "answer": "الإجابة المدخلة",
 *   "validate": true  // اختياري - إذا كان true سيتحقق من الإجابة فقط دون التحديث
 * }
 */
function submitAnswer(req, res, next) {
  try {
    const { answer } = req.body;
    const stateFile = path.join(process.cwd(), "family_feud_round_state.json");

    if (!fs.existsSync(stateFile)) {
      return res.status(404).json({
        success: false,
        message: "لا توجد جولة نشطة"
      });
    }

    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));

    // التطبيع
    const normalize = (str) => {
      if (!str) return "";
      return String(str)
        .toLowerCase()
        .replace(/[\u064B-\u0652\u0640]/g, "")
        .replace(/[^\u0600-\u06FF0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^ال\s?/, "")
        .trim();
    };

    const normalizedInput = normalize(answer);
    const foundAnswer = state.answers.find(
      ans => !ans.revealed && normalize(ans.answer) === normalizedInput
    );

    if (foundAnswer) {
      // إجابة صحيحة
      // إذا كان هذا صحيحًا في وضع السرقة ولست الفريق الأصلي،
      // فتعامل معه كعملية سرقة: يمنح الفريق الحالي فقط نقاط الفريق الأصلي السابقة
      if (state.isStealMode && state.currentTeam !== state.originalTeam) {
        const originalPoints = state.roundScore; // النقاط التي جمعها الفريق A مسبقًا
        // لا نضيف نقاط الإجابة الجديدة لها
        state.roundScore = originalPoints;
        // اكشف كل الإجابات حتى تُعرض للمستخدمين
        state.answers.forEach(a => a.revealed = true);
      } else {
        // حالة عادية: أضف نقاط هذه الإجابة إلى المجموع
        state.roundScore += foundAnswer.points;
      }

      foundAnswer.revealed = true;

      // حفظ الحالة
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");

      return res.status(200).json({
        success: true,
        correct: true,
        message: "إجابة صحيحة!",
        answer: foundAnswer.answer,
        points: foundAnswer.points,
        roundScore: state.roundScore,
        roundState: state
      });
    } else {
      // إجابة خاطئة

      // special case: stealing team gets a single try
      if (state.isStealMode && state.currentTeam !== state.originalTeam) {
        // steal failed -> round ends, original team keeps roundScore
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");
        return res.status(200).json({
          success: true,
          correct: false,
          message: "خطأ أثناء محاولة السرقة",
          stealFailed: true,
          roundScore: state.roundScore,
          originalTeam: state.originalTeam,
          roundState: state
        });
      }

      state.wrongAttempts++;
      let message = `إجابة خاطئة (${state.wrongAttempts}/3)`;

      // التحقق من تفعيل وضع السرقة
      if (state.wrongAttempts >= 3 && !state.isStealMode) {
        state.isStealMode = true;
        state.originalTeam = state.currentTeam;
        state.currentTeam = state.currentTeam === "team1" ? "team2" : "team1";
        state.wrongAttempts = 0;
        message += " - تم تفعيل وضع السرقة!";
      }

      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");

      return res.status(200).json({
        success: true,
        correct: false,
        message: message,
        wrongAttempts: state.wrongAttempts,
        stealModeActivated: state.isStealMode,
        currentTeam: state.currentTeam,
        roundState: state
      });
    }

  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/ai/family-feud/update-team
 * تحديث الفريق الحالي (عند نهاية دور الفريق)
 */
function updateCurrentTeam(req, res, next) {
  try {
    const stateFile = path.join(process.cwd(), "family_feud_round_state.json");

    if (!fs.existsSync(stateFile)) {
      return res.status(404).json({
        success: false,
        message: "لا توجد جولة نشطة"
      });
    }

    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));

    // إعادة تعيين متغيرات الفريق
    state.currentTeam = state.currentTeam === "team1" ? "team2" : "team1";
    state.wrongAttempts = 0;
    state.isStealMode = false;
    state.originalTeam = null;

    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");

    return res.status(200).json({
      success: true,
      message: "تم تحديث الفريق الحالي",
      currentTeam: state.currentTeam,
      roundState: state
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFamilyFeud,
  startFamilyFeudRound,
  getRoundState,
  submitAnswer,
  updateCurrentTeam
};