import { Router } from "express";
import { COMMAND_IDS, getAdminUrl, HELP_TEXT } from "../config/commands";
import {
  createChatResponse,
  extractChatText,
  getChatMessage,
  getChatUser,
  getSlashCommandId
} from "../googleChat";
import { createChatReply } from "../services/openaiChat";
import {
  formatActivityDetails,
  formatRotationList,
  formatRotationNow
} from "../services/rotationMessages";
import { getRotation, ROTATION_IDS } from "../services/rotationService";
import { saveUser, slugifyUserId } from "../services/userService";

async function captureChatUser(body: any) {
  const user = getChatUser(body);
  const email = typeof user?.email === "string" ? user.email.trim() : "";
  const chatUserId = typeof user?.name === "string" ? user.name.trim() : "";
  const displayName =
    typeof user?.displayName === "string" ? user.displayName.trim() : "";

  if (!email || !chatUserId) {
    return null;
  }

  const savedUser = await saveUser({
    id: slugifyUserId(email),
    displayName: displayName || email,
    email,
    chatUserId
  });

  return savedUser;
}

async function getCommandResponse(commandIdOrText: string) {
  const command = commandIdOrText.replace(/^\//, "").toLowerCase();

  switch (commandIdOrText) {
    case COMMAND_IDS.HELP:
    case "help":
      return HELP_TEXT;

    case COMMAND_IDS.LINKEDIN_NOW:
    case "linkedinnow":
      return formatRotationNow(
        "LinkedIn",
        await getRotation(ROTATION_IDS.LINKEDIN)
      );

    case COMMAND_IDS.LINKEDIN_LIST:
    case "linkedinlist":
      return formatRotationList(
        "LinkedIn",
        await getRotation(ROTATION_IDS.LINKEDIN)
      );

    case COMMAND_IDS.ACTIVITY_NOW:
    case "activitynow":
      {
        const rotation = await getRotation(ROTATION_IDS.ACTIVITY);

        return `${formatRotationNow("Activity", rotation)}\n${formatActivityDetails(
          rotation
        )}`;
      }

    case COMMAND_IDS.ACTIVITY_LIST:
    case "activitylist":
      {
        const rotation = await getRotation(ROTATION_IDS.ACTIVITY);

        return `${formatRotationList("Activity", rotation)}\n${formatActivityDetails(
          rotation
        )}`;
      }

    case COMMAND_IDS.ADMIN:
    case "admin":
      return `Admin UI: ${getAdminUrl()}`;

    default:
      if (command !== commandIdOrText) {
        return getCommandResponse(command);
      }

      return null;
  }
}

export function createGoogleChatRouter() {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      console.log("FULL_GOOGLE_CHAT_PAYLOAD");
      console.log(JSON.stringify(req.body, null, 2));

      const message = getChatMessage(req.body);
      const text = extractChatText(req.body);
      const slashCommandId = getSlashCommandId(req.body);
      const capturedUser = await captureChatUser(req.body);

      console.log(
        JSON.stringify({
          type: "google_chat_event",
          eventType: req.body?.type,
          slashCommandId,
          hasArgumentText: Boolean(message?.argumentText),
          hasText: Boolean(message?.text),
          parsedText: text,
          capturedUserId: capturedUser?.id || null
        })
      );

      if (slashCommandId) {
        return res.json(
          createChatResponse(req.body, {
            text:
              (await getCommandResponse(String(slashCommandId))) ||
              "Unknown slash command."
          })
        );
      }

      const commandResponse = await getCommandResponse(text);

      if (commandResponse) {
        return res.json(createChatResponse(req.body, { text: commandResponse }));
      }

      if (!text) {
        return res.json(
          createChatResponse(req.body, {
            text: "Hi - mention me with a message or type /help."
          })
        );
      }

      const thread = message?.thread?.name || "default";
      const reply = await createChatReply(thread, text);

      return res.json(createChatResponse(req.body, { text: reply }));
    } catch (error: any) {
      const isQuota = error?.status === 429;

      console.log(
        JSON.stringify({
          type: "openai_error",
          status: isQuota ? "quota_exceeded" : "error",
          httpStatus: error?.status || 500,
          message: error?.message
        })
      );

      return res.json(
        createChatResponse(req.body, {
          text: isQuota
            ? "AI service quota exceeded. Please check billing."
            : "I hit an error while responding."
        })
      );
    }
  });

  return router;
}
