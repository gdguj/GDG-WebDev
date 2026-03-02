function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[هة]/g, "ه") // treat taa marbuta same as ha
    .replace(/[^\u0600-\u06FF0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^ال\s?/, "")
    .trim();
}

function validateFamilyFeud(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Output is not a valid JSON object.");
  }

  if (typeof data.question !== "string" || !data.question.trim()) {
    throw new Error("Missing or invalid 'question'.");
  }

  if (!isArabic(data.question)) {
    throw new Error("Question must be in Arabic.");
  }

  if (!Array.isArray(data.answers)) {
    throw new Error("Missing or invalid 'answers' array.");
  }

  if (!Array.isArray(data.answers)) {
    throw new Error("Missing or invalid 'answers' array.");
  }

  if (data.answers.length !== 10) {
    throw new Error("Answers must be exactly 10.");
  }

  const normalizedQuestion = normalize(data.question);
  data.answers.forEach((a, i) => {
    if (!a || typeof a !== "object") {
      throw new Error(`Answer #${i + 1} is not a valid object.`);
    }

    if (typeof a.answer !== "string" || !a.answer.trim()) {
      throw new Error(`Answer #${i + 1} missing 'answer' text.`);
    }

    if (!isArabic(a.answer)) {
      throw new Error(`Answer #${i + 1} must be Arabic.`);
    }

    const normAns = normalize(a.answer);
    if (normAns === normalizedQuestion) {
      throw new Error(`Answer #${i + 1} duplicates the question.`);
    }

    if (!Number.isInteger(a.points) || a.points < 1 || a.points > 100) {
      throw new Error(
        `Answer #${i + 1} has invalid points (must be integer 1..100).`
      );
    }
  });

  return true;
}

module.exports = { validateFamilyFeud };