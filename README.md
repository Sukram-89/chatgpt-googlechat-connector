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

## Deploy to Cloud Run
Use Cloud Run to deploy this app and configure the Google Chat app webhook to the HTTPS endpoint.
