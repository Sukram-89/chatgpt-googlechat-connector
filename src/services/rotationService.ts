import {
  getRotationState,
  RotationConfig,
  RotationMember,
  RotationState
} from "../rotation";
import { db } from "./firestore";

const ROTATION_COLLECTION = "rotation_configs";

export const ROTATION_IDS = {
  LINKEDIN: "linkedin",
  ACTIVITY: "activity"
} as const;

export function sanitizeMembers(members: unknown): RotationMember[] {
  if (!Array.isArray(members)) {
    return [];
  }

  return members
    .map((member) => {
      if (!member || typeof member !== "object") {
        return null;
      }

      const data = member as Record<string, unknown>;
      const userId = typeof data.userId === "string" ? data.userId.trim() : "";
      const displayName =
        typeof data.displayName === "string" ? data.displayName.trim() : "";
      const chatUserId =
        typeof data.chatUserId === "string" ? data.chatUserId.trim() : "";
      const email = typeof data.email === "string" ? data.email.trim() : "";

      if (!displayName) {
        return null;
      }

      return {
        displayName,
        ...(userId ? { userId } : {}),
        ...(chatUserId ? { chatUserId } : {}),
        ...(email ? { email } : {})
      };
    })
    .filter((member): member is RotationMember => Boolean(member));
}

export function sanitizeRotationConfig(body: unknown): RotationConfig {
  const data =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const activityDate =
    typeof data.activityDate === "string" ? data.activityDate.trim() : "";

  return {
    members: sanitizeMembers(data.members),
    ...(activityDate ? { activityDate } : {})
  };
}

export async function getRotationConfig(
  rotationId: string
): Promise<RotationConfig> {
  const doc = await db.collection(ROTATION_COLLECTION).doc(rotationId).get();
  const data = doc.exists ? doc.data() : null;

  return {
    members: sanitizeMembers(data?.members),
    ...(typeof data?.activityDate === "string" && data.activityDate.trim()
      ? { activityDate: data.activityDate.trim() }
      : {})
  };
}

export async function getRotation(rotationId: string): Promise<RotationState> {
  return getRotationState(await getRotationConfig(rotationId));
}

export async function saveRotationConfig(
  rotationId: string,
  config: RotationConfig
): Promise<RotationState> {
  await db.collection(ROTATION_COLLECTION).doc(rotationId).set(
    {
      members: config.members,
      activityDate: config.activityDate || null,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  return getRotationState(config);
}
