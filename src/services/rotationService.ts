import {
  getRotationState,
  RotationConfig,
  RotationMember,
  RotationState
} from "../rotation";
import {
  getRotationConfigData,
  saveRotationConfigData
} from "./firestore";

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
      const activityName =
        typeof data.activityName === "string" ? data.activityName.trim() : "";
      const activityDate =
        typeof data.activityDate === "string" ? data.activityDate.trim() : "";

      if (!displayName) {
        return null;
      }

      return {
        displayName,
        ...(userId ? { userId } : {}),
        ...(chatUserId ? { chatUserId } : {}),
        ...(email ? { email } : {}),
        ...(activityName ? { activityName } : {}),
        ...(activityDate ? { activityDate } : {})
      };
    })
    .filter((member): member is RotationMember => Boolean(member));
}

export function sanitizeRotationConfig(body: unknown): RotationConfig {
  const data =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const activityDate =
    typeof data.activityDate === "string" ? data.activityDate.trim() : "";
  const activityName =
    typeof data.activityName === "string" ? data.activityName.trim() : "";

  return {
    members: sanitizeMembers(data.members),
    ...(activityDate ? { activityDate } : {}),
    ...(activityName ? { activityName } : {})
  };
}

export async function getRotationConfig(
  rotationId: string
): Promise<RotationConfig> {
  const config = await getRotationConfigData(rotationId);

  return {
    members: sanitizeMembers(config.members),
    ...(typeof config.activityDate === "string" && config.activityDate.trim()
      ? { activityDate: config.activityDate.trim() }
      : {}),
    ...(typeof config.activityName === "string" && config.activityName.trim()
      ? { activityName: config.activityName.trim() }
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
  await saveRotationConfigData(rotationId, config);

  return getRotationState(config);
}
