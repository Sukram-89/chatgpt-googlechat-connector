import { Firestore } from "@google-cloud/firestore";

export const db = new Firestore();

export async function getCollectionDocuments(collection: string) {
  const snapshot = await db.collection(collection).get();

  return Object.fromEntries(snapshot.docs.map((doc) => [doc.id, doc.data()]));
}

export async function getMonthlyAssignment(collection: string) {
  const month = new Date().toISOString().slice(0, 7);
  const doc = await db.collection(collection).doc(month).get();

  return doc.exists ? doc.data() : null;
}

export async function saveMonthlyAssignment(
  collection: string,
  month: string,
  payload: Record<string, unknown>
) {
  await db.collection(collection).doc(month).set(payload, {
    merge: true
  });
}
