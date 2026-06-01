import { Firestore } from "@google-cloud/firestore";
import type { RotationConfig } from "../rotation";

interface StoredUser {
  id: string;
  displayName: string;
  email: string;
  chatUserId?: string;
}

interface StoredRotationConfig extends RotationConfig {
  updatedAt?: string;
}

const useMockData =
  process.env.USE_MOCK_DATA !== "false" &&
  !process.env.GOOGLE_CLOUD_PROJECT &&
  !process.env.GCLOUD_PROJECT &&
  !process.env.FIRESTORE_EMULATOR_HOST;

let realDb: Firestore | null = null;

function getRealDb() {
  if (!realDb) {
    realDb = new Firestore();
  }

  return realDb;
}

const mockUsers = new Map<string, StoredUser>([
  [
    "markus-happyhobos-se",
    {
      id: "markus-happyhobos-se",
      displayName: "Markus Hoff",
      email: "markus@happyhobos.se",
      chatUserId: "users/markus-happyhobos-se"
    }
  ],
  [
    "helge-happyhobos-se",
    {
      id: "helge-happyhobos-se",
      displayName: "Helge Lind",
      email: "helge@happyhobos.se",
      chatUserId: "users/helge-happyhobos-se"
    }
  ],
  [
    "anna-happyhobos-se",
    {
      id: "anna-happyhobos-se",
      displayName: "Anna Svensson",
      email: "anna@happyhobos.se",
      chatUserId: "users/anna-happyhobos-se"
    }
  ]
]);

const mockRotationConfigs = new Map<string, StoredRotationConfig>([
  [
    "linkedin",
    {
      members: [
        {
          displayName: "Markus Hoff",
          email: "markus@happyhobos.se",
          chatUserId: "users/markus-happyhobos-se",
          userId: "markus-happyhobos-se"
        },
        {
          displayName: "Helge Lind",
          email: "helge@happyhobos.se",
          chatUserId: "users/helge-happyhobos-se",
          userId: "helge-happyhobos-se"
        },
        {
          displayName: "Anna Svensson",
          email: "anna@happyhobos.se",
          chatUserId: "users/anna-happyhobos-se",
          userId: "anna-happyhobos-se"
        }
      ]
    }
  ],
  [
    "activity",
    {
      activityName: "Sommarfest",
      activityDate: "2026-06-26",
      members: [
        {
          displayName: "Helge Lind",
          email: "helge@happyhobos.se",
          chatUserId: "users/helge-happyhobos-se",
          userId: "helge-happyhobos-se"
        },
        {
          displayName: "Markus Hoff",
          email: "markus@happyhobos.se",
          chatUserId: "users/markus-happyhobos-se",
          userId: "markus-happyhobos-se"
        },
        {
          displayName: "Anna Svensson",
          email: "anna@happyhobos.se",
          chatUserId: "users/anna-happyhobos-se",
          userId: "anna-happyhobos-se"
        }
      ]
    }
  ]
]);

const mockMonthlyAssignments = new Map<string, Map<string, Record<string, unknown>>>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getMockCollection(collection: string) {
  if (!mockMonthlyAssignments.has(collection)) {
    mockMonthlyAssignments.set(collection, new Map<string, Record<string, unknown>>());
  }

  return mockMonthlyAssignments.get(collection)!;
}

export function isMockDataMode() {
  return useMockData;
}

export async function getCollectionDocuments(collection: string) {
  if (useMockData) {
    return Object.fromEntries(
      Array.from(getMockCollection(collection).entries()).map(([id, data]) => [
        id,
        clone(data)
      ])
    );
  }

  const snapshot = await getRealDb().collection(collection).get();

  return Object.fromEntries(snapshot.docs.map((doc) => [doc.id, doc.data()]));
}

export async function getMonthlyAssignment(collection: string) {
  const month = new Date().toISOString().slice(0, 7);

  if (useMockData) {
    return clone(getMockCollection(collection).get(month) || null);
  }

  const doc = await getRealDb().collection(collection).doc(month).get();

  return doc.exists ? doc.data() : null;
}

export async function saveMonthlyAssignment(
  collection: string,
  month: string,
  payload: Record<string, unknown>
) {
  if (useMockData) {
    getMockCollection(collection).set(month, clone(payload));
    return;
  }

  await getRealDb().collection(collection).doc(month).set(payload, {
    merge: true
  });
}

export async function listUsersData(): Promise<StoredUser[]> {
  if (useMockData) {
    return Array.from(mockUsers.values())
      .map((user) => clone(user))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  const snapshot = await getRealDb()
    .collection("users")
    .orderBy("displayName")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      displayName: String(data.displayName || doc.id),
      email: String(data.email || ""),
      ...(typeof data.chatUserId === "string" && data.chatUserId
        ? { chatUserId: data.chatUserId }
        : {})
    };
  });
}

export async function saveUserData(user: StoredUser) {
  if (useMockData) {
    mockUsers.set(user.id, clone(user));
    return;
  }

  await getRealDb().collection("users").doc(user.id).set(
    {
      displayName: user.displayName,
      chatUserId: user.chatUserId || null,
      email: user.email || null,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

export async function deleteUserData(userId: string) {
  if (useMockData) {
    mockUsers.delete(userId);
    return;
  }

  await getRealDb().collection("users").doc(userId).delete();
}

export async function getRotationConfigData(
  rotationId: string
): Promise<RotationConfig> {
  if (useMockData) {
    const data = mockRotationConfigs.get(rotationId);

    return {
      members: clone(data?.members || []),
      ...(typeof data?.activityDate === "string" && data.activityDate.trim()
        ? { activityDate: data.activityDate.trim() }
        : {}),
      ...(typeof data?.activityName === "string" && data.activityName.trim()
        ? { activityName: data.activityName.trim() }
        : {})
    };
  }

  const doc = await getRealDb().collection("rotation_configs").doc(rotationId).get();
  const data = doc.exists ? doc.data() : null;

  return {
    members: Array.isArray(data?.members) ? (data.members as RotationConfig["members"]) : [],
    ...(typeof data?.activityDate === "string" && data.activityDate.trim()
      ? { activityDate: data.activityDate.trim() }
      : {}),
    ...(typeof data?.activityName === "string" && data.activityName.trim()
      ? { activityName: data.activityName.trim() }
      : {})
  };
}

export async function saveRotationConfigData(
  rotationId: string,
  config: RotationConfig
) {
  if (useMockData) {
    mockRotationConfigs.set(rotationId, {
      members: clone(config.members || []),
      ...(config.activityDate ? { activityDate: config.activityDate } : {}),
      ...(config.activityName ? { activityName: config.activityName } : {}),
      updatedAt: new Date().toISOString()
    });
    return;
  }

  await getRealDb().collection("rotation_configs").doc(rotationId).set(
    {
      members: config.members,
      activityDate: config.activityDate || null,
      activityName: config.activityName || null,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}
