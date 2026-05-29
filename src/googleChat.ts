export function getChatMessage(body: any) {
  return body?.chat?.messagePayload?.message || body?.message;
}

export function getSlashCommandId(body: any) {
  return (
    body?.appCommandMetadata?.appCommandId ||
    body?.chat?.appCommandMetadata?.appCommandId ||
    body?.message?.slashCommand?.commandId ||
    null
  );
}

export function extractChatText(body: any) {
  const message = getChatMessage(body);
  const argumentText = message?.argumentText?.trim();

  if (argumentText) {
    return argumentText;
  }

  const text = message?.text?.trim() || "";

  return text
    .replace(/<users\/[\w-]+>/g, "")
    .replace(/^@[^\s]+\s*/i, "")
    .trim();
}
