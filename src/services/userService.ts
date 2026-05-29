import { db } from "./firestore";

const USERS_COLLECTION = "users";

export interface ManagedUser {
  id: string;
  displayName: string;
  chatUserId?: string;
  email?: string;
}

function slugify(value: string) {
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
  const id = requestedId || slugify(email || displayName);

  if (!id || !displayName) {
    throw new Error("User requires id and displayName");
  }

  return {
    id,
    displayName,
    ...(chatUserId ? { chatUserId } : {}),
    ...(email ? { email } : {})
  };
}

export async function listUsers(): Promise<ManagedUser[]> {
  const snapshot = await db.collection(USERS_COLLECTION).orderBy("displayName").get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      displayName: String(data.displayName || doc.id),
      ...(typeof data.chatUserId === "string" && data.chatUserId
        ? { chatUserId: data.chatUserId }
        : {}),
      ...(typeof data.email === "string" && data.email
        ? { email: data.email }
        : {})
    };
  });
}

export async function saveUser(user: ManagedUser) {
  await db.collection(USERS_COLLECTION).doc(user.id).set(
    {
      displayName: user.displayName,
      chatUserId: user.chatUserId || null,
      email: user.email || null,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  return user;
}

export async function deleteUser(userId: string) {
  await db.collection(USERS_COLLECTION).doc(userId).delete();
}
