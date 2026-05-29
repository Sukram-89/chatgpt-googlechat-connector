import { Router } from "express";
import { COMMAND_IDS, getAdminUrl, HELP_TEXT } from "../config/commands";
import {
  extractChatText,
  getChatMessage,
  getSlashCommandId
} from "../googleChat";
import { createChatReply } from "../services/openaiChat";
import {
  formatRotationList,
  formatRotationNow
} from "../services/rotationMessages";
import { getRotation, ROTATION_IDS } from "../services/rotationService";

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

        return `${formatRotationNow("Activity", rotation)} Activity date: ${
          rotation.activityDate || "TBD"
        }.`;
      }

    case COMMAND_IDS.ACTIVITY_LIST:
    case "activitylist":
      {
        const rotation = await getRotation(ROTATION_IDS.ACTIVITY);

        return `${formatRotationList("Activity", rotation)}\nActivity date: ${
          rotation.activityDate || "TBD"
        }`;
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

      console.log(
        JSON.stringify({
          type: "google_chat_event",
          eventType: req.body?.type,
          slashCommandId,
          hasArgumentText: Boolean(message?.argumentText),
          hasText: Boolean(message?.text),
          parsedText: text
        })
      );

      if (slashCommandId) {
        return res.json({
          text: (await getCommandResponse(slashCommandId)) || "Unknown slash command."
        });
      }

      const commandResponse = await getCommandResponse(text);

      if (commandResponse) {
        return res.json({ text: commandResponse });
      }

      if (!text) {
        return res.json({
          text: "Hi - mention me with a message or type /help."
        });
      }

      const thread = message?.thread?.name || "default";
      const reply = await createChatReply(thread, text);

      return res.json({
        text: reply
      });
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

      return res.json({
        text: isQuota
          ? "AI service quota exceeded. Please check billing."
          : "I hit an error while responding."
      });
    }
  });

  return router;
}
