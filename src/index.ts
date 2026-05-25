import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const threadMemory = new Map<string, string[]>();

type GoogleChatEvent = {
  type?: string;
  space?: {
    name?: string;
    type?: string;
    displayName?: string;
  };
  message?: {
    name?: string;
    text?: string;
    argumentText?: string;
    thread?: {
      name?: string;
    };
    annotations?: Array<{
      type?: string;
      startIndex?: number;
      length?: number;
      userMention?: {
        type?: string;
        user?: {
          name?: string;
          displayName?: string;
        };
      };
    }>;
  };
};

function shouldRespond(event: GoogleChatEvent): boolean {
  if (event.type !== "MESSAGE") {
    return false;
  }

  // In direct messages, every message is intended for the app.
  if (event.space?.type === "DM") {
    return true;
  }

  // In spaces, respond only when the app is explicitly mentioned.
  return Boolean(
    event.message?.annotations?.some(
      (annotation) =>
        annotation.type === "USER_MENTION" &&
        annotation.userMention?.type === "MENTION"
    )
  );
}

function getPrompt(event: GoogleChatEvent): string {
  // Google Chat usually provides argumentText with the app mention removed.
  const argumentText = event.message?.argumentText?.trim();
  if (argumentText) {
    return argumentText;
  }

  const text = event.message?.text || "";
  return text.replace(/<users\/.+?>/g, "").replace(/^@\S+\s*/, "").trim();
}

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/", async (req, res) => {
  const event = req.body as GoogleChatEvent;

  console.log(
    JSON.stringify({
      eventType: event.type,
      spaceType: event.space?.type,
      messageName: event.message?.name,
      text: event.message?.text,
      argumentText: event.message?.argumentText,
      annotations: event.message?.annotations?.map((annotation) => ({
        type: annotation.type,
        userMentionType: annotation.userMention?.type,
        userDisplayName: annotation.userMention?.user?.displayName
      }))
    })
  );

  try {
    if (event.type === "ADDED_TO_SPACE") {
      return res.json({ text: "Hi! Mention me in a space, or message me directly, and I’ll answer." });
    }

    if (!shouldRespond(event)) {
      return res.json({});
    }

    const prompt = getPrompt(event);
    if (!prompt) {
      return res.json({ text: "How can I help?" });
    }

    const thread = event.message?.thread?.name || event.space?.name || "default";
    const history = threadMemory.get(thread) || [];
    history.push(`user: ${prompt}`);

    const response = await openai.responses.create({
      model,
      input: history.join("\n")
    });

    const reply = response.output_text || "No response.";
    history.push(`assistant: ${reply}`);
    threadMemory.set(thread, history.slice(-10));

    return res.json({ text: reply });
  } catch (error) {
    console.error(error);
    return res.json({ text: "AI service unavailable right now. Check the Cloud Run logs for details." });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Google Chat bot running");
});
