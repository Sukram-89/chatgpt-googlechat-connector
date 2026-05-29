import { Router } from "express";
import {
  postDmReminder,
  postSpaceNotification
} from "../services/googleChatNotifier";
import { getMention } from "../services/rotationMessages";
import { getRotation, ROTATION_IDS } from "../services/rotationService";

const ACTIVITY_REMINDER_DAYS_BEFORE = 45;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getUtcDateOnly(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getDaysUntil(activityDate: string, now = new Date()) {
  const parsed = new Date(`${activityDate}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.round((getUtcDateOnly(parsed) - getUtcDateOnly(now)) / MS_PER_DAY);
}

async function sendLinkedInNotification() {
  const rotation = await getRotation(ROTATION_IDS.LINKEDIN);
  const current = rotation.current;
  const mention = current ? getMention(current) : "someone";
  const message = `Hey ${mention} is now responsible for the LinkedIn posts.`;

  const spaceNotification = await postSpaceNotification(message);

  return {
    type: "linkedin",
    message,
    current,
    spaceNotification
  };
}

async function sendActivityNotification() {
  const rotation = await getRotation(ROTATION_IDS.ACTIVITY);
  const current = rotation.current;
  const mention = current ? getMention(current) : "someone";
  const message = `Hey the monthly activity is at ${
    rotation.activityDate || "TBD"
  }, and responsible is ${mention}.`;

  const spaceNotification = await postSpaceNotification(message);

  return {
    type: "activity",
    message,
    dmMessage: current?.displayName
      ? `Hi ${current.displayName}, you're responsible this month.`
      : null,
    current,
    activityDate: rotation.activityDate || null,
    spaceNotification
  };
}

async function sendMonthlyNotification() {
  const [linkedinRotation, activityRotation] = await Promise.all([
    getRotation(ROTATION_IDS.LINKEDIN),
    getRotation(ROTATION_IDS.ACTIVITY)
  ]);
  const linkedinMention = linkedinRotation.current
    ? getMention(linkedinRotation.current)
    : "someone";
  const activityMention = activityRotation.current
    ? getMention(activityRotation.current)
    : "someone";
  const message = `This month ${linkedinMention} is responsible for LinkedIn, and ${activityMention} is responsible for the monthly activity${
    activityRotation.activityDate ? ` on ${activityRotation.activityDate}` : ""
  }.`;
  const spaceNotification = await postSpaceNotification(message);

  return {
    type: "monthly",
    message,
    linkedin: {
      current: linkedinRotation.current
    },
    activity: {
      current: activityRotation.current,
      activityDate: activityRotation.activityDate || null
    },
    spaceNotification
  };
}

async function sendActivityReminder(force = false) {
  const rotation = await getRotation(ROTATION_IDS.ACTIVITY);
  const current = rotation.current;

  if (!rotation.activityDate) {
    return {
      type: "activity-reminder",
      sent: false,
      reason: "Missing activity date",
      current,
      activityDate: null
    };
  }

  const daysUntil = getDaysUntil(rotation.activityDate);

  if (daysUntil === null) {
    return {
      type: "activity-reminder",
      sent: false,
      reason: "Invalid activity date",
      current,
      activityDate: rotation.activityDate
    };
  }

  if (!force && daysUntil !== ACTIVITY_REMINDER_DAYS_BEFORE) {
    return {
      type: "activity-reminder",
      sent: false,
      reason: `Activity is ${daysUntil} days away`,
      daysUntil,
      current,
      activityDate: rotation.activityDate
    };
  }

  const message = `Hi ${
    current?.displayName || "there"
  }, reminder: you're responsible for the monthly activity on ${
    rotation.activityDate
  }. Please start planning now.`;
  const dmNotification = await postDmReminder(current?.chatUserId, message);

  return {
    type: "activity-reminder",
    sent: dmNotification.delivered,
    message,
    daysUntil,
    current,
    activityDate: rotation.activityDate,
    dmNotification
  };
}

export function createSchedulerRouter() {
  const router = Router();

  router.post("/test-message", async (req, res) => {
    const text =
      typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!text) {
      return res.status(400).json({
        error: "Missing text"
      });
    }

    res.json({
      message: text,
      spaceNotification: await postSpaceNotification(text)
    });
  });

  router.post("/linkedin", async (_req, res) => {
    res.json(await sendLinkedInNotification());
  });

  router.post("/activity", async (_req, res) => {
    res.json(await sendActivityNotification());
  });

  router.post("/activity-reminder", async (req, res) => {
    res.json(await sendActivityReminder(req.query.force === "true"));
  });

  router.post("/monthly", async (_req, res) => {
    res.json(await sendMonthlyNotification());
  });

  return router;
}
