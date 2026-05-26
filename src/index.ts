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

async function getAssignments(collection: string) {
  const snapshot = await db.collection(collection).get();
  return Object.fromEntries(snapshot.docs.map((doc) => [doc.id, doc.data()]));
}

async function getCurrentAssignment(collection: string) {
  const month = new Date().toISOString().slice(0, 7);
  const doc = await db.collection(collection).doc(month).get();
  return doc.exists ? doc.data() : null;
}

async function saveAssignment(collection: string, month: string, payload: Record<string, unknown>) {
  await db.collection(collection).doc(month).set(payload, { merge: true });
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

app.post("/api/linkedin-assignment", async (req, res) => {
  const { month, displayName, chatUserId } = req.body;
  await saveAssignment("linkedin_assignments", month, { displayName, chatUserId });
  res.json({ saved: true });
});

app.post("/api/activity-assignment", async (req, res) => {
  const { month, displayName, activityDate, chatUserId } = req.body;
  await saveAssignment("activity_assignments", month, { displayName, activityDate, chatUserId });
  res.json({ saved: true });
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

app.post("/scheduler/linkedin", async (_req, res) => {
  const current = await getCurrentAssignment("linkedin_assignments");
  const mention = current?.chatUserId ? `<users/${current.chatUserId}>` : current?.displayName || "someone";

  res.json({
    message: `Hey ${mention} is now responsible for the LinkedIn posts.`
  });
});

app.post("/scheduler/activity", async (_req, res) => {
  const current = await getCurrentAssignment("activity_assignments");
  const mention = current?.chatUserId ? `<users/${current.chatUserId}>` : current?.displayName || "someone";

  res.json({
    message: `Hey the monthly activity is at ${current?.activityDate || "TBD"}, and responsible is ${mention}.`,
    dmMessage: current?.displayName
      ? `Hi ${current.displayName}, you're responsible this month.`
      : null
  });
});

app.get("/linkedin/auth", (_req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: "Missing LinkedIn OAuth configuration" });
  }

  linkedInOauthState = Math.random().toString(36).slice(2);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: linkedInOauthState,
    scope: "w_organization_social"
  });

  return res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
});

app.get("/linkedin/callback", (req, res) => {
  const { code, state, error, error_description } = req.query;

  console.log(JSON.stringify({
    type: "linkedin_callback",
    hasCode: Boolean(code),
    hasState: Boolean(state),
    error,
    errorDescription: error_description
  }));

  if (error) {
    return res.status(400).json({ error, errorDescription: error_description });
  }

  if (!state || state !== linkedInOauthState) {
    return res.status(400).json({ error: "Invalid OAuth state" });
  }

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  linkedInAccessToken = code as string;
  linkedInOauthState = null;

  return res.json({ status: "LinkedIn auth flow completed (MVP placeholder)" });
});

app.post("/", async (req, res) => {
  try {
    const text = req.body?.message?.argumentText || req.body?.message?.text || "";

    if (text === "/help") {
      return res.json({ text: "Commands: /help, /linkedinlist, /linkedinnow, /activitylist, /activitynow" });
    }

    const thread = req.body?.message?.thread?.name || "default";
    const history = threadMemory.get(thread) || [];
    history.push(`user: ${text}`);

    const response = await openai.responses.create({
      model,
      input: history.join("\n")
    });

    const reply = response.output_text || "No response.";
    history.push(`assistant: ${reply}`);
    threadMemory.set(thread, history.slice(-10));

    return res.json({ text: reply });
  } catch (error: any) {
    const isQuota = error?.status === 429;

    console.log(JSON.stringify({
      type: "openai_error",
      status: isQuota ? "quota_exceeded" : "error",
      httpStatus: error?.status || 500
    }));

    return res.json({
      text: isQuota
        ? "AI service quota exceeded. Please check billing."
        : "AI service temporarily unavailable."
    });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Google Chat bot running");
});
