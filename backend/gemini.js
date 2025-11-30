const axios = require("axios");
require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

async function generateRoom(stage = 1, challenge = "", difficulty = "Easy") {
  const prompt = `
You are generating a single "room" for a text-based puzzle game called "Mind Escape".
Story stage: ${stage}
Challenge: ${challenge}
Difficulty: ${difficulty}

Return ONLY JSON in this format:
{
 "roomDescription": "<short atmospheric description>",
 "puzzle": "<unique puzzle question or quote>",
 "options": ["A: ...", "B: ...", "C: ..."],
 "correct": "A"
}
`;

  try {
    const res = await axios.post(GEMINI_URL, {
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    let output = res.data.candidates[0].content.parts[0].text;
    output = output.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return { room: JSON.parse(output) };
  } catch (err) {
    const errorData = err.response?.data;
    if (errorData?.error?.code === 429) {
      const match = errorData.error.message.match(/Please retry in (\d+\.?\d*)s/);
      const waitTime = match ? Math.ceil(parseFloat(match[1])) : 60;
      return { quotaExceeded: true, waitTime };
    }
    console.error("Gemini request error (generateRoom):", errorData || err);
    throw new Error("Gemini API request failed");
  }
}

async function validateAnswer(correct, player) {
  return correct.toUpperCase() === player.toUpperCase() ? "correct" : "wrong";
}

async function generateRestartMotivation() {
  try {
    const prompt = `Generate a unique motivational sentence for a player who failed and restarted in a game. One sentence only.`;
    const res = await axios.post(GEMINI_URL, { contents: [{ role: "user", parts: [{ text: prompt }] }] });
    return res.data.candidates[0].content.parts[0].text.trim();
  } catch {
    return "Keep trying, greatness is near!";
  }
}

async function generateCorrectMotivation() {
  try {
    const prompt = `Generate a sarcastic/funny motivational sentence for a player who answered correctly. One sentence only.`;
    const res = await axios.post(GEMINI_URL, { contents: [{ role: "user", parts: [{ text: prompt }] }] });
    return res.data.candidates[0].content.parts[0].text.trim();
  } catch {
    return "Wow, you actually got it!";
  }
}

module.exports = { generateRoom, validateAnswer, generateRestartMotivation, generateCorrectMotivation };
