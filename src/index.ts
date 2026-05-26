import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const threadMemory = new Map<string, string[]>();
let linkedInAccessToken: string | null = null;

// Existing chat handling remains; simplified helpers omitted for brevity.
app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/linkedin/auth", (_req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  const scope = "w_organization_social";

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri || "")}&scope=${scope}`;
  res.redirect(authUrl);
});

app.get("/linkedin/callback", (req, res) => {
  // MVP placeholder. Real token exchange should happen here.
  linkedInAccessToken = req.query.code as string;
  res.json({ status: "LinkedIn connected (MVP placeholder)" });
});

app.post("/linkedin/publish", async (req, res) => {
  const { caption } = req.body;

  if (!linkedInAccessToken) {
    return res.status(400).json({ error: "LinkedIn not connected" });
  }

  // MVP placeholder for company-page image+text posting.
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

    console.log(
      JSON.stringify({
        type: "openai_error",
        status: isQuota ? "quota_exceeded" : "error",
        httpStatus: error?.status || 500
      })
    );

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
