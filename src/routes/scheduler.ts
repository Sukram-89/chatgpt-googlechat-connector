import { Router } from "express";
import { getMention } from "../services/rotationMessages";
import { getRotation, ROTATION_IDS } from "../services/rotationService";

export function createSchedulerRouter() {
  const router = Router();

  router.post("/linkedin", async (_req, res) => {
    const rotation = await getRotation(ROTATION_IDS.LINKEDIN);
    const current = rotation.current;
    const mention = current ? getMention(current) : "someone";

    res.json({
      message: `Hey ${mention} is now responsible for the LinkedIn posts.`
    });
  });

  router.post("/activity", async (_req, res) => {
    const rotation = await getRotation(ROTATION_IDS.ACTIVITY);
    const current = rotation.current;
    const mention = current ? getMention(current) : "someone";

    res.json({
      message: `Hey the monthly activity is at ${
        rotation.activityDate || "TBD"
      }, and responsible is ${mention}.`,
      dmMessage: current?.displayName
        ? `Hi ${current.displayName}, you're responsible this month.`
        : null
    });
  });

  return router;
}
