import express from "express";
import { createApiRouter } from "./routes/api";
import { createGoogleChatRouter } from "./routes/googleChat";
import { createLinkedInRouter } from "./routes/linkedin";
import { createPublicRouter } from "./routes/public";
import { createRotationRouter } from "./routes/rotation";
import { createSchedulerRouter } from "./routes/scheduler";

const app = express();

app.use(express.json());
app.use(createPublicRouter());
app.use("/api", createApiRouter());
app.use(createRotationRouter());
app.use("/scheduler", createSchedulerRouter());
app.use("/linkedin", createLinkedInRouter());
app.use(createGoogleChatRouter());

app.listen(process.env.PORT || 8080, () => {
  console.log("Google Chat bot running");
});
