import express from "express";
import OpenAI from "openai";
import path from "path";

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const threadMemory = new Map<string, string[]>();
const linkedInAssignments = new Map<string, string>();
const activityAssignments = new Map<string, string>();
let linkedInAccessToken: string | null = null;
let linkedInOauthState: string | null = null;

linkedInAssignments.set("2026-01", "Markus");
activityAssignments.set("2026-01", "Andreas");

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "src", "admin.html"));
});

app.get("/api/linkedinlist", (_req, res) => {
  res.json(Object.fromEntries(linkedInAssignments));
});

app.get("/api/activitylist", (_req, res) => {
  res.json(Object.fromEntries(activityAssignments));
});

app.post("/scheduler/linkedin", (_req, res) => {
  const current = linkedInAssignments.get("2026-01");
  res.json({ message: `Hey ${current} is now responsible for the LinkedIn posts.` });
});

app.post("/scheduler/activity", (_req, res) => {
  const current = activityAssignments.get("2026-01");
  res.json({ message: `Hey the monthly activity is scheduled, responsible is ${current}.` });
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

app.post("/linkedin/publish", async (req, res) => {
  const { caption } = req.body;

  if (!linkedInAccessToken) {
    return res.status(400).json({ error: "LinkedIn not connected" });
  }

  return res.json({
    status: "ready_for_linkedin_publish",
    organizationId: process.env.LINKEDIN_ORGANIZATION_ID,
    caption,
    hasToken: true
  });
});

app.post("/", async (req, res) => {
  try {
    const text = req.body?.message?.argumentText || req.body?.message?.text || "";

    if (text === "/linkedinlist") {
      return res.json({ text: JSON.stringify(Object.fromEntries(linkedInAssignments)) });
    }

    if (text === "/activitylist") {
      return res.json({ text: JSON.stringify(Object.fromEntries(activityAssignments)) });
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
