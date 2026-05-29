export interface NotificationResult {
  configured: boolean;
  delivered: boolean;
  status?: number;
  error?: string;
}

function getSpaceWebhookUrl() {
  return process.env.GOOGLE_CHAT_WEBHOOK_URL || "";
}

function getDmWebhookMap(): Record<string, string> {
  const raw = process.env.GOOGLE_CHAT_DM_WEBHOOKS;

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function postToWebhook(
  webhookUrl: string,
  text: string
): Promise<NotificationResult> {
  if (!webhookUrl) {
    return {
      configured: false,
      delivered: false
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    return {
      configured: true,
      delivered: response.ok,
      status: response.status,
      ...(response.ok ? {} : { error: await response.text() })
    };
  } catch (error: any) {
    return {
      configured: true,
      delivered: false,
      error: error?.message || "Failed to post Google Chat notification"
    };
  }
}

export async function postSpaceNotification(text: string) {
  return postToWebhook(getSpaceWebhookUrl(), text);
}

export async function postDmReminder(chatUserId: string | undefined, text: string) {
  if (!chatUserId) {
    return {
      configured: false,
      delivered: false,
      error: "Missing chatUserId for DM reminder"
    };
  }

  const webhookUrl = getDmWebhookMap()[chatUserId] || "";

  if (!webhookUrl) {
    return {
      configured: false,
      delivered: false,
      error: `Missing DM webhook for ${chatUserId}`
    };
  }

  return postToWebhook(webhookUrl, text);
}
