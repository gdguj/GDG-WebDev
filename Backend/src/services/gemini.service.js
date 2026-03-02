const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PROMPT = `
Generate a **general** Family Feud style survey question in Arabic about everyday life or common knowledge
(not tied to any specific academic subject).
The question should have **exactly 10 clear, factual answers** in Arabic. Do not include the question word itself as an answer (e.g. if the question mentions "مطبخ" do not answer "مطبخ"). Answers must be realistic, popular survey responses—no absurd or meta items such as "مطبخ داخل مطبخ".

Return JSON ONLY with this exact schema:
{
  "question": "string",
  "answers": [
    { "answer": "string", "points": number }
  ]
}

Rules:
- Arabic only for question and answers.
- 5 to 8 answers (not more, not less).
- Answers must be easy to understand and true.
- Points must be integers from 1 to 100.
- Do not include any extra text, markdown, or code fences. JSON only.
`.trim();

async function generateFamilyFeudRawJSON() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(PROMPT);
  let text = result.response.text().trim();
  

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    text = jsonMatch[1].trim();
  }
  
  
  const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    text = jsonObjectMatch[0];
  }
  
  return text;
}

module.exports = { generateFamilyFeudRawJSON };