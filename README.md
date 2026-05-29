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
