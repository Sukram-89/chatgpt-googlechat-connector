import express from "express";
import OpenAI from "openai";
import path from "path";
import { Firestore } from "@google-cloud/firestore";

const app = express();
app.use(express.json());

const db = new Firestore();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const threadMemory = new Map<string, string[]>();
let linkedInAccessToken: string | null = null;
let linkedInOauthState: string | null = null;

function extractChatText(body: any) {
  const argumentText = body?.message?.argumentText?.trim();
  if (argumentText) return argumentText;

  const text = body?.message?.text?.trim() || "";
  return text
    .replace(/<users\/[\w-]+>/g, "")
    .replace(/^@[^\s]+\s*/i, "")
    .trim();
}

async function getAssignments(collection: string) {
  const snapshot = await db.collection(collection).get();
  return Object.fromEntries(snapshot.docs.map((doc) => [doc.id, doc.data()]));
}

async function getCurrentAssignment(collection: string) {
  const month = new Date().toISOString().slice(0, 7);
  const doc = await db.collection(collection).doc(month).get();
  return doc.exists ? doc.data() : null;
}

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/help", (_req, res) => {
  res.json({
    commands: ["/help", "/linkedinlist", "/linkedinnow", "/activitylist", "/activitynow"]
  });
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "src", "admin.html"));
});

app.get("/api/linkedinlist", async (_req, res) => {
  res.json(await getAssignments("linkedin_assignments"));
});

app.get("/api/activitylist", async (_req, res) => {
  res.json(await getAssignments("activity_assignments"));
});

app.get("/linkedinnow", async (_req, res) => {
  res.json(await getCurrentAssignment("linkedin_assignments"));
});

app.get("/activitynow", async (_req, res) => {
  res.json(await getCurrentAssignment("activity_assignments"));
});

app.post("/", async (req, res) => {
  try {
    const text = extractChatText(req.body);

    console.log(JSON.stringify({
      type: "google_chat_event",
      eventType: req.body?.type,
      hasArgumentText: Boolean(req.body?.message?.argumentText),
      hasText: Boolean(req.body?.message?.text),
      parsedText: text
    }));

    if (!text) {
      return res.json({ text: "Hi — mention me with a message or type /help." });
    }

    if (text === "/help" || text.toLowerCase() === "help") {
      return res.json({
        text: "Commands: /help, /linkedinlist, /linkedinnow, /activitylist, /activitynow"
      });
    }

    if (text === "/linkedinlist") {
      return res.json({ text: JSON.stringify(await getAssignments("linkedin_assignments")) });
    }

    if (text === "/activitylist") {
      return res.json({ text: JSON.stringify(await getAssignments("activity_assignments")) });
    }

    if (text === "/linkedinnow") {
      return res.json({ text: JSON.stringify(await getCurrentAssignment("linkedin_assignments")) });
    }

    if (text === "/activitynow") {
      return res.json({ text: JSON.stringify(await getCurrentAssignment("activity_assignments")) });
    }

    const thread = req.body?.message?.thread?.name || "default";
    const history = threadMemory.get(thread) || [];
    history.push(`user: ${text}`);

    const response = await openai.responses.create({
      model,
      input: history.join("\n")
    });

    const reply = (response.output_text || "No response.").trim() || "I understood that, but I had nothing to say.";

    history.push(`assistant: ${reply}`);
    threadMemory.set(thread, history.slice(-10));

    return res.json({ text: reply });
  } catch (error: any) {
    const isQuota = error?.status === 429;

    console.log(JSON.stringify({
      type: "openai_error",
      status: isQuota ? "quota_exceeded" : "error",
      httpStatus: error?.status || 500,
      message: error?.message
    }));

    return res.json({
      text: isQuota
        ? "AI service quota exceeded. Please check billing."
        : "I hit an error while responding."
    });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Google Chat bot running");
});
