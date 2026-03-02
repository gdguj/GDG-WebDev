const fs = require("fs");
const path = require("path");

const { generateFamilyFeudRawJSON } = require("../services/gemini.service");
const { validateFamilyFeud } = require("../utils/validateJSON");

// بيانات افتراضية للاستخدام عند فشل API
const FALLBACK_QUESTIONS = [
  {
    question: "اذكر مصطلحًا أو مجالًا أساسيًا من مجالات علوم الحاسوب",
    answers: [
      { answer: "الذكاء الاصطناعي", points: 98 },
      { answer: "الأمن السيبراني", points: 92 },
      { answer: "علم البيانات", points: 88 },
      { answer: "الحوسبة السحابية", points: 84 },
      { answer: "تعلم الآلة", points: 79 },
      { answer: "الشبكات", points: 73 },
      { answer: "قواعد البيانات", points: 67 },
      { answer: "تطوير البرمجيات", points: 60 },
      { answer: "الخوارزميات", points: 55 },
      { answer: "أنظمة التشغيل", points: 50 }
    ]
  },
  {
    question: "اذكر شيئًا يستخدم في البرمجة أو تطوير البرمجيات",
    answers: [
      { answer: "المحرر النصي", points: 85 },
      { answer: "الكمبايلر", points: 75 },
      { answer: "نظام التحكم بالإصدارات", points: 70 },
      { answer: "API", points: 65 },
      { answer: "خادم التطوير", points: 60 },
      { answer: "قاعدة البيانات", points: 55 },
      { answer: "الإطار (framework)", points: 50 },
      { answer: "الحاويات", points: 45 },
      { answer: "الوحدة النمطية", points: 40 },
      { answer: "التوثيق", points: 35 }
    ]
  }
];

// helper لاختيار عنصر عشوائي
function randomFallback() {
  const idx = Math.floor(Math.random() * FALLBACK_QUESTIONS.length);
  return FALLBACK_QUESTIONS[idx];
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

module.exports = { getFamilyFeud };