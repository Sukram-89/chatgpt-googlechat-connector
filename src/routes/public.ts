import { Router } from "express";
import path from "path";
import { SLASH_COMMANDS } from "../config/commands";

export function createPublicRouter() {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/help", (_req, res) => {
    res.json({
      commands: SLASH_COMMANDS.map((command) => `/${command.name}`)
    });
  });

  router.get("/admin", (_req, res) => {
    res.sendFile(path.join(process.cwd(), "src", "admin.html"));
  });

  router.get("/google-chat-commands", (_req, res) => {
    res.json({ slashCommands: SLASH_COMMANDS });
  });

  return router;
}
