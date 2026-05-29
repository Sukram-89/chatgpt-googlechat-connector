import { Router } from "express";
import { getRotation, ROTATION_IDS } from "../services/rotationService";

export function createRotationRouter() {
  const router = Router();

  router.get("/linkedinnow", async (_req, res) => {
    res.json(await getRotation(ROTATION_IDS.LINKEDIN));
  });

  router.get("/activitynow", async (_req, res) => {
    res.json(await getRotation(ROTATION_IDS.ACTIVITY));
  });

  return router;
}
