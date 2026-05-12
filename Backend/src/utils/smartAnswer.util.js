function normalizeArabicAnswer(text) {
  if (!text || typeof text !== "string") return "";

  return text
    .trim()
    .toLowerCase()
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/^ال/, "")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSmartAnswerMatch(userAnswer, correctAnswer) {
  const user = normalizeArabicAnswer(userAnswer);
  const correct = normalizeArabicAnswer(correctAnswer);

  if (user === correct) return true;

  const typoUser = user.replace(/ئ/g, "ي").replace(/ؤ/g, "و");
  const typoCorrect = correct.replace(/ئ/g, "ي").replace(/ؤ/g, "و");

  return typoUser === typoCorrect;
}

module.exports = {
  normalizeArabicAnswer,
  isSmartAnswerMatch,
};

