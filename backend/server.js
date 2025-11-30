require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { generateRoom, validateAnswer, generateRestartMotivation, generateCorrectMotivation } = require("./gemini");

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const PORT = process.env.PORT || 5000;

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/room", async (req, res) => {
  try {
    const stage = req.body?.storyStage || 1;
    const challenge = req.body?.challenge || "";
    const difficulty = req.body?.difficulty || "Easy";

    const result = await generateRoom(stage, challenge, difficulty);

    if(result.quotaExceeded){
      return res.status(429).json({ quotaExceeded: true, waitTime: result.waitTime });
    }

    res.json(result.room);
  } catch (err) {
    console.error("Error /room:", err?.message || err);
    res.status(500).json({ error: "Failed to generate room" });
  }
});

app.post("/validate", async (req, res) => {
  try {
    const { correct, player } = req.body;
    const result = await validateAnswer(correct, player);
    res.json({ result });
  } catch (err) {
    console.error("Error /validate:", err?.message || err);
    res.status(500).json({ error: "Failed to validate answer" });
  }
});

app.get("/motivation/restart", async (req, res) => {
  try {
    const sentence = await generateRestartMotivation();
    res.json({ sentence });
  } catch {
    res.status(500).json({ error: "Failed to generate motivation" });
  }
});

app.get("/motivation/correct", async (req, res) => {
  try {
    const sentence = await generateCorrectMotivation();
    res.json({ sentence });
  } catch {
    res.status(500).json({ error: "Failed to generate motivation" });
  }
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
