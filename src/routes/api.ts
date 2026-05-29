import { Router } from "express";
import {
  getCollectionDocuments,
  saveMonthlyAssignment
} from "../services/firestore";
import {
  getRotation,
  ROTATION_IDS,
  sanitizeRotationConfig,
  saveRotationConfig
} from "../services/rotationService";

export function createApiRouter() {
  const router = Router();

  router.get("/linkedin-rotation", async (_req, res) => {
    res.json(await getRotation(ROTATION_IDS.LINKEDIN));
  });

  router.post("/linkedin-rotation", async (req, res) => {
    const config = sanitizeRotationConfig(req.body);
    const rotation = await saveRotationConfig(ROTATION_IDS.LINKEDIN, config);

    res.json({ saved: true, ...rotation });
  });

  router.put("/linkedin-rotation", async (req, res) => {
    const config = sanitizeRotationConfig(req.body);
    const rotation = await saveRotationConfig(ROTATION_IDS.LINKEDIN, config);

    res.json({ saved: true, ...rotation });
  });

  router.get("/activity-rotation", async (_req, res) => {
    res.json(await getRotation(ROTATION_IDS.ACTIVITY));
  });

  router.post("/activity-rotation", async (req, res) => {
    const config = sanitizeRotationConfig(req.body);
    const rotation = await saveRotationConfig(ROTATION_IDS.ACTIVITY, config);

    res.json({ saved: true, ...rotation });
  });

  router.put("/activity-rotation", async (req, res) => {
    const config = sanitizeRotationConfig(req.body);
    const rotation = await saveRotationConfig(ROTATION_IDS.ACTIVITY, config);

    res.json({ saved: true, ...rotation });
  });

  router.post("/linkedin-assignment", async (req, res) => {
    const { month, displayName, chatUserId } = req.body;

    await saveMonthlyAssignment("linkedin_assignments", month, {
      displayName,
      chatUserId
    });

    res.json({ saved: true });
  });

  router.post("/activity-assignment", async (req, res) => {
    const { month, displayName, activityDate, chatUserId } = req.body;

    await saveMonthlyAssignment("activity_assignments", month, {
      displayName,
      activityDate,
      chatUserId
    });

    res.json({ saved: true });
  });

  router.get("/linkedinlist", async (_req, res) => {
    res.json(await getRotation(ROTATION_IDS.LINKEDIN));
  });

  router.get("/activitylist", async (_req, res) => {
    res.json(await getRotation(ROTATION_IDS.ACTIVITY));
  });

  router.get("/legacy/linkedin-assignments", async (_req, res) => {
    res.json(await getCollectionDocuments("linkedin_assignments"));
  });

  router.get("/legacy/activity-assignments", async (_req, res) => {
    res.json(await getCollectionDocuments("activity_assignments"));
  });

  return router;
}
