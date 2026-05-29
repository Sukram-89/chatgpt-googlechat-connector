export function getChatMessage(body: any) {
  return body?.chat?.messagePayload?.message || body?.message;
}

export function getChatUser(body: any) {
  return (
    body?.user ||
    body?.chat?.user ||
    body?.chat?.messagePayload?.message?.sender ||
    body?.message?.sender ||
    null
  );
}

export function getSlashCommandId(body: any) {
  return (
    body?.appCommandMetadata?.appCommandId ||
    body?.chat?.appCommandMetadata?.appCommandId ||
    body?.chat?.appCommandPayload?.appCommandMetadata?.appCommandId ||
    body?.message?.slashCommand?.commandId ||
    body?.chat?.messagePayload?.message?.slashCommand?.commandId ||
    null
  );
}

export function isAppCommandPayload(body: any) {
  return Boolean(body?.chat?.appCommandPayload);
}

export function createChatResponse(body: any, message: Record<string, unknown>) {
  if (isAppCommandPayload(body)) {
    return {
      hostAppDataAction: {
        chatDataAction: {
          createMessageAction: {
            message
          }
        }
      }
    };
  }

  return message;
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
