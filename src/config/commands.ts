export const COMMAND_IDS = {
  HELP: "1",
  LINKEDIN_NOW: "2",
  LINKEDIN_LIST: "3",
  ACTIVITY_NOW: "4",
  ACTIVITY_LIST: "5",
  ADMIN: "6"
} as const;

export const SLASH_COMMANDS = [
  {
    commandId: COMMAND_IDS.HELP,
    name: "help",
    description: "Show available HoboAI commands."
  },
  {
    commandId: COMMAND_IDS.LINKEDIN_NOW,
    name: "linkedinnow",
    description: "Show who is currently responsible for LinkedIn."
  },
  {
    commandId: COMMAND_IDS.LINKEDIN_LIST,
    name: "linkedinlist",
    description: "Show the LinkedIn responsibility rotation."
  },
  {
    commandId: COMMAND_IDS.ACTIVITY_NOW,
    name: "activitynow",
    description: "Show the current activity owner and activity date."
  },
  {
    commandId: COMMAND_IDS.ACTIVITY_LIST,
    name: "activitylist",
    description: "Show the activity responsibility rotation."
  },
  {
    commandId: COMMAND_IDS.ADMIN,
    name: "admin",
    description: "Open the HoboAI admin UI."
  }
] as const;

export const HELP_TEXT =
  "Commands: /help, /linkedinlist, /linkedinnow, /activitylist, /activitynow, /admin";

export function getAdminUrl() {
  return (
    process.env.ADMIN_URL ||
    "https://chatgpt-googlechat-connector-974238519156.europe-west1.run.app/admin"
  );
}
