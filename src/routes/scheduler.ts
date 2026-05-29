import { Router } from "express";
import {
  postDmReminder,
  postSpaceNotification
} from "../services/googleChatNotifier";
import { getMention } from "../services/rotationMessages";
import { getRotation, ROTATION_IDS } from "../services/rotationService";
import {
  getStockholmDayOfMonth,
  getTodayDateOnly,
  isLastWorkdayOfMonth,
  isWeekday
} from "../services/workdayService";

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
  const message = `Hey the monthly activity${
    rotation.activityName ? ` "${rotation.activityName}"` : ""
  } is at ${rotation.activityDate || "TBD"}, and responsible is ${mention}.`;

  const spaceNotification = await postSpaceNotification(message);

  return {
    type: "activity",
    message,
    dmMessage: current?.displayName
      ? `Hi ${current.displayName}, you're responsible this month.`
      : null,
    current,
    activityName: rotation.activityName || null,
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
  const activityLabel = activityRotation.activityName
    ? `monthly activity "${activityRotation.activityName}"`
    : "monthly activity";
  const message = `This month ${linkedinMention} is responsible for LinkedIn, and ${activityMention} is responsible for the ${activityLabel}${
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
      activityName: activityRotation.activityName || null,
      activityDate: activityRotation.activityDate || null
    },
    spaceNotification
  };
}

function getSchedulerDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date();
  }

  return new Date(`${value}T12:00:00.000+01:00`);
}

function formatDaysOff(
  daysOff: Array<{
    date: string;
    name: string;
  }>
) {
  if (!daysOff.length) {
    return "No days off this month.";
  }

  return `Days off this month: ${daysOff
    .map((dayOff) => `${dayOff.date} (${dayOff.name})`)
    .join(", ")}.`;
}

async function sendHoursReminder(force = false, now = new Date()) {
  const today = getTodayDateOnly(now);

  if (!force && getStockholmDayOfMonth(now) < 25) {
    return {
      type: "hours-reminder",
      sent: false,
      reason: "Before the 25th; skipping Arbetsdag API check",
      today
    };
  }

  if (!force && !isWeekday(now)) {
    return {
      type: "hours-reminder",
      sent: false,
      reason: "Weekend; skipping Arbetsdag API check",
      today
    };
  }

  const workdayCheck = await isLastWorkdayOfMonth(now);

  if (!force && !workdayCheck.isLastWorkday) {
    return {
      type: "hours-reminder",
      sent: false,
      reason: "Today is not the last workday of the month",
      today,
      lastDayOfMonth: workdayCheck.lastDayOfMonth,
      remainingWorkdaysInMonth: workdayCheck.remainingWorkdaysInMonth,
      monthWorkdays: workdayCheck.monthWorkdays,
      expectedHours: workdayCheck.expectedHours,
      daysOff: workdayCheck.daysOff
    };
  }

  const message = `Reminder: please report your hours for this month. Expected hours: ${workdayCheck.expectedHours}h (${workdayCheck.monthWorkdays} workdays x 8h). ${formatDaysOff(
    workdayCheck.daysOff
  )}`;
  const spaceNotification = await postSpaceNotification(message);

  return {
    type: "hours-reminder",
    sent: spaceNotification.delivered,
    message,
    today,
    lastDayOfMonth: workdayCheck.lastDayOfMonth,
    remainingWorkdaysInMonth: workdayCheck.remainingWorkdaysInMonth,
    monthWorkdays: workdayCheck.monthWorkdays,
    expectedHours: workdayCheck.expectedHours,
    daysOff: workdayCheck.daysOff,
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
  }, reminder: you're responsible for the monthly activity${
    rotation.activityName ? ` "${rotation.activityName}"` : ""
  } on ${rotation.activityDate}. Please start planning now.`;
  const dmNotification = await postDmReminder(current?.chatUserId, message);

  return {
    type: "activity-reminder",
    sent: dmNotification.delivered,
    message,
    daysUntil,
    current,
    activityName: rotation.activityName || null,
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

  router.post("/hours-reminder", async (req, res) => {
    try {
      res.json(
        await sendHoursReminder(
          req.query.force === "true",
          getSchedulerDate(req.query.date)
        )
      );
    } catch (error: any) {
      res.status(500).json({
        type: "hours-reminder",
        sent: false,
        error: error?.message || "Failed to evaluate workday"
      });
    }
  });

  return router;
}
