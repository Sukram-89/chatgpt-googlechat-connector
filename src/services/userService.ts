import {
  deleteUserData,
  listUsersData,
  saveUserData
} from "./firestore";

export interface ManagedUser {
  id: string;
  displayName: string;
  chatUserId?: string;
  email: string;
}

export function slugifyUserId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sanitizeUser(body: unknown): ManagedUser {
  const data =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const displayName =
    typeof data.displayName === "string" ? data.displayName.trim() : "";
  const chatUserId =
    typeof data.chatUserId === "string" ? data.chatUserId.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const requestedId = typeof data.id === "string" ? data.id.trim() : "";
  const id = requestedId || slugifyUserId(email);

  if (!id || !displayName || !email) {
    throw new Error("User requires displayName and email");
  }

  return {
    id,
    displayName,
    email,
    ...(chatUserId ? { chatUserId } : {})
  };
}

export async function listUsers(): Promise<ManagedUser[]> {
  const users = await listUsersData();

  return users.map((user) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    ...(user.chatUserId ? { chatUserId: user.chatUserId } : {})
  }));
}

export async function saveUser(user: ManagedUser) {
  await saveUserData(user);

  return user;
}

export async function deleteUser(userId: string) {
  await deleteUserData(userId);
}
