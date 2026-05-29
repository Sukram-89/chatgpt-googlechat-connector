# chatgpt-googlechat-connector

Google Chat bot using Node.js, TypeScript, Express, and OpenAI.

## Features
- Mention-based replies in Google Chat
- Thread memory (in-memory MVP)
- OpenAI integration
- Cloud Run-ready deployment
- Foundation for approval-card workflows

## Setup
npm install
cp .env.example .env
npm run dev

## Environment
- OPENAI_API_KEY
- OPENAI_MODEL
- ADMIN_URL
- GOOGLE_CHAT_WEBHOOK_URL
- GOOGLE_CHAT_DM_WEBHOOKS
- ARBETSDAG_API_KEY

## Deploy to Cloud Run
Use Cloud Run to deploy this app and configure the Google Chat app webhook to the HTTPS endpoint.

## Google Chat slash commands
Configure the Google Chat app with these command IDs and names. The same list is available in `google-chat-slash-commands.json` and from `GET /google-chat-commands`.

| Command ID | Command |
| --- | --- |
| 1 | `/help` |
| 2 | `/linkedinnow` |
| 3 | `/linkedinlist` |
| 4 | `/activitynow` |
| 5 | `/activitylist` |
| 6 | `/admin` |

## Monthly notifications
Configure a Google Chat incoming webhook URL in `GOOGLE_CHAT_WEBHOOK_URL`.

Test backend-to-webhook posting with:

```sh
POST /scheduler/test-message
```

Trigger the combined monthly Infohub notification from Cloud Scheduler on the 1st of every month with:

```sh
POST /scheduler/monthly
```

That sends one message naming the current LinkedIn responsible and monthly activity responsible.

You can also trigger the notifications individually:

```sh
POST /scheduler/linkedin
POST /scheduler/activity
```

Activity DM reminders are sent 45 days before the configured activity date. Run this endpoint daily from Cloud Scheduler; it only sends when the activity is exactly 45 days away:

```sh
POST /scheduler/activity-reminder
```

For testing, bypass the date check with:

```sh
POST /scheduler/activity-reminder?force=true
```

Hours reminders use `ARBETSDAG_API_KEY` to find the last Swedish workday of the month. Run this endpoint daily from Cloud Scheduler; it skips locally before the 25th and on weekends, then calls Arbetsdag only near month-end on weekdays:

```sh
POST /scheduler/hours-reminder
```

For testing, bypass the workday check with:

```sh
POST /scheduler/hours-reminder?force=true
```

You can also test the date logic for a specific date:

```sh
POST /scheduler/hours-reminder?date=2026-06-30
```

Combine both to force-send the message while calculating expected hours for a specific month:

```sh
POST /scheduler/hours-reminder?date=2026-06-30&force=true
```

Provide per-user DM webhook URLs as JSON in `GOOGLE_CHAT_DM_WEBHOOKS`, keyed by `chatUserId`:

```json
{
  "users/123": "https://chat.googleapis.com/v1/spaces/..."
}
```

Incoming webhooks post to the space they were created for. For real 1:1 direct messages, replace the per-user webhook map with Google Chat API authentication and direct-message space creation.

Managed users require an email address. If a canonical Google Chat user ID is not set, rotation messages mention users by email with `<users/person@happyhobos.se>`.
