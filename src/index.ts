import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const threadMemory = new Map<string, string[]>();

app.post("/", async (req, res) => {
  try {
    const text = req.body?.message?.text || "";
    const thread = req.body?.message?.thread?.name || "default";
    const botName = req.body?.space?.displayName || "";

    if (!text.includes("@") && !text.toLowerCase().includes(botName.toLowerCase())) {
      return res.json({});
    }

    const cleaned = text.replace(/<users\/.+?>/g, "").trim();

    const history = threadMemory.get(thread) || [];
    history.push(`user: ${cleaned}`);

    const response = await openai.responses.create({
      model,
      input: history.join("\n")
    });

    const reply = response.output_text || "No response.";
    history.push(`assistant: ${reply}`);
    threadMemory.set(thread, history.slice(-10));

    res.json({ text: reply });
  } catch (error) {
    res.json({ text: "AI service unavailable right now." });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Google Chat bot running");
});
