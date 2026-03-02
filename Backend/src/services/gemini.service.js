const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PROMPT = `
Generate a Family Feud style question in Arabic about computer science
(covering topics like Software Engineering, AI, Data Science, Cybersecurity, Networking, etc.)
with exactly 10 answers in Arabic.

Return JSON ONLY with this exact schema:
{
  "question": "string",
  "answers": [
    { "answer": "string", "points": number }
  ]
}

Rules:
- Arabic only for question and answers.
- Exactly 10 answers.
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