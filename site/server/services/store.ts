import { firestore } from "./firebase";

export type DeviceSession = {
  deviceCode: string;
  userId: string;
  extensionToken: string;
  expiresAt: number;
  claimedAt?: number;
};

type FieldUpdatedAt = Record<string, number>;

export type SettingsDoc = {
  values: Record<string, unknown>;
  fieldUpdatedAt: FieldUpdatedAt;
  settingsRevision: number;
  updatedAt: number;
};

export async function upsertDeviceSession(session: DeviceSession) {
  await firestore
    .collection("deviceSessions")
    .doc(session.deviceCode)
    .set(session, { merge: true });

  await firestore
    .collection("extensionSessions")
    .doc(session.extensionToken)
    .set({
      userId: session.userId,
      expiresAt: session.expiresAt,
      createdAt: Date.now()
    });
}

export async function claimDeviceSession(deviceCode: string): Promise<DeviceSession | null> {
  const ref = firestore.collection("deviceSessions").doc(deviceCode);
  const snap = await ref.get();
  if (!snap.exists) {
    return null;
  }
  const data = snap.data() as DeviceSession;
  if (data.claimedAt) {
    return null;
  }
  await ref.set({ claimedAt: Date.now() }, { merge: true });
  return data;
}

export async function getSettingsDoc(userId: string): Promise<SettingsDoc | null> {
  const snap = await firestore.collection("settings").doc(userId).get();
  if (!snap.exists) {
    return null;
  }
  return snap.data() as SettingsDoc;
}

export async function upsertSettingsDoc(userId: string, next: SettingsDoc): Promise<SettingsDoc> {
  const normalized: SettingsDoc = {
    values: next.values || {},
    fieldUpdatedAt: next.fieldUpdatedAt || {},
    settingsRevision: Number(next.settingsRevision || 0),
    updatedAt: Number(next.updatedAt || Date.now())
  };
  await firestore.collection("settings").doc(userId).set(normalized, { merge: true });
  return normalized;
}

export function mergeSettingsDocs(localDoc: SettingsDoc, remoteDoc: SettingsDoc | null): SettingsDoc {
  if (!remoteDoc) {
    return localDoc;
  }

  const mergedValues: Record<string, unknown> = { ...remoteDoc.values };
  const mergedFieldUpdatedAt: Record<string, number> = { ...remoteDoc.fieldUpdatedAt };
  const keys = new Set([
    ...Object.keys(localDoc.values || {}),
    ...Object.keys(remoteDoc.values || {})
  ]);

  for (const key of keys) {
    const localAt = Number(localDoc.fieldUpdatedAt?.[key] || 0);
    const remoteAt = Number(remoteDoc.fieldUpdatedAt?.[key] || 0);
    const localHasKey = Object.prototype.hasOwnProperty.call(localDoc.values || {}, key);
    const remoteHasKey = Object.prototype.hasOwnProperty.call(remoteDoc.values || {}, key);

    // If neither side has per-key timestamps yet, prefer existing remote value
    // so first-time device linking can pull cloud settings down.
    if (localAt === 0 && remoteAt === 0) {
      if (remoteHasKey) {
        mergedValues[key] = remoteDoc.values[key];
        mergedFieldUpdatedAt[key] = 0;
      } else if (localHasKey) {
        mergedValues[key] = localDoc.values[key];
        mergedFieldUpdatedAt[key] = 0;
      }
      continue;
    }

    if (localAt >= remoteAt) {
      mergedValues[key] = localDoc.values[key];
      mergedFieldUpdatedAt[key] = localAt || Date.now();
    } else {
      mergedValues[key] = remoteDoc.values[key];
      mergedFieldUpdatedAt[key] = remoteAt;
    }
  }

  return {
    values: mergedValues,
    fieldUpdatedAt: mergedFieldUpdatedAt,
    settingsRevision: Math.max(
      Number(localDoc.settingsRevision || 0),
      Number(remoteDoc.settingsRevision || 0)
    ),
    updatedAt: Date.now()
  };
}
