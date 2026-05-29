import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const threadMemory = new Map<string, string[]>();

export async function createChatReply(thread: string, text: string) {
  const history = threadMemory.get(thread) || [];

  history.push(`user: ${text}`);

  const response = await openai.responses.create({
    model,
    input: history.join("\n")
  });

  const reply =
    (response.output_text || "No response.").trim() ||
    "I understood that, but I had nothing to say.";

  history.push(`assistant: ${reply}`);
  threadMemory.set(thread, history.slice(-10));

  return reply;
}
