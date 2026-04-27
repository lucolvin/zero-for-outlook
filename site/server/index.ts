import "./env";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { adminAuth, firestore } from "./services/firebase";
import {
  getClerkProfileForExtensionToken,
  verifyClerkBearerToken,
  verifyExtensionBearerToken
} from "./services/auth";
import {
  getSettingsDoc,
  upsertSettingsDoc,
  mergeSettingsDocs,
  claimDeviceSession,
  upsertDeviceSession
} from "./services/store";

const app = express();
const port = Number(process.env.API_PORT || 8787);

function getApiError(error: unknown) {
  const e = error as { code?: number | string; message?: string };
  const code = Number(e?.code);
  const message = String(e?.message || "Unexpected server error.");

  // Firestore gRPC NOT_FOUND is common when the database hasn't been created yet.
  if (code === 5 || message.includes("5 NOT_FOUND")) {
    return {
      status: 503,
      error:
        "Firestore is not initialized for this project. Open Firebase Console -> Firestore Database and create the database first."
    };
  }

  if (message.includes("Missing bearer token") || message.includes("Invalid") || message.includes("Expired")) {
    return { status: 401, error: message };
  }

  return { status: 500, error: message };
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/auth/extension-token", async (req, res) => {
  try {
    const userId = await verifyClerkBearerToken(req.headers.authorization);
    const deviceCode = String(req.body?.deviceCode || "");
    if (!deviceCode) {
      res.status(400).json({ ok: false, error: "deviceCode is required." });
      return;
    }

    const extensionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 1000 * 60 * 30;

    await upsertDeviceSession({
      deviceCode,
      userId,
      extensionToken,
      expiresAt
    });

    res.json({ ok: true, state: "issued", extensionToken, expiresAt });
  } catch (error) {
    const apiError = getApiError(error);
    res.status(apiError.status).json({ ok: false, error: apiError.error });
  }
});

app.get("/auth/extension-token/claim", async (req, res) => {
  try {
    const deviceCode = String(req.query.device_code || "");
    if (!deviceCode) {
      res.status(400).json({ ok: false, error: "device_code is required." });
      return;
    }

    const claimed = await claimDeviceSession(deviceCode);
    if (!claimed) {
      res.json({ ok: true, state: "pending" });
      return;
    }
    if (claimed.expiresAt <= Date.now()) {
      res.status(410).json({ ok: false, state: "expired", error: "Device code expired." });
      return;
    }

    res.json({
      ok: true,
      state: "claimed",
      extensionToken: claimed.extensionToken,
      expiresAt: claimed.expiresAt
    });
  } catch (error) {
    const apiError = getApiError(error);
    res.status(apiError.status).json({ ok: false, state: "error", error: apiError.error });
  }
});

app.get("/settings", async (req, res) => {
  try {
    const userId = await verifyExtensionBearerToken(req.headers.authorization, adminAuth, firestore);
    const doc = await getSettingsDoc(userId);
    res.json({ ok: true, settings: doc ?? null });
  } catch (error) {
    const apiError = getApiError(error);
    res.status(apiError.status).json({ ok: false, error: apiError.error });
  }
});

app.get("/auth/me", async (req, res) => {
  try {
    const profile = await getClerkProfileForExtensionToken(
      req.headers.authorization,
      adminAuth,
      firestore
    );
    res.json({
      ok: true,
      profile: {
        userId: profile.userId,
        name: profile.name,
        imageUrl: profile.imageUrl
      }
    });
  } catch (error) {
    const apiError = getApiError(error);
    res.status(apiError.status).json({ ok: false, error: apiError.error });
  }
});

app.put("/settings", async (req, res) => {
  try {
    const userId = await verifyExtensionBearerToken(req.headers.authorization, adminAuth, firestore);
    const settingsDoc = req.body?.settings;
    if (!settingsDoc || typeof settingsDoc !== "object") {
      res.status(400).json({ ok: false, error: "settings payload is required." });
      return;
    }

    const written = await upsertSettingsDoc(userId, settingsDoc);
    res.json({ ok: true, settings: written });
  } catch (error) {
    const apiError = getApiError(error);
    res.status(apiError.status).json({ ok: false, error: apiError.error });
  }
});

app.post("/settings/merge", async (req, res) => {
  try {
    const userId = await verifyExtensionBearerToken(req.headers.authorization, adminAuth, firestore);
    const localDoc = req.body?.local;
    if (!localDoc || typeof localDoc !== "object") {
      res.status(400).json({ ok: false, error: "local settings payload is required." });
      return;
    }
    const remoteDoc = (await getSettingsDoc(userId)) || null;
    const merged = mergeSettingsDocs(localDoc, remoteDoc);
    const saved = await upsertSettingsDoc(userId, merged);
    res.json({ ok: true, settings: saved });
  } catch (error) {
    const apiError = getApiError(error);
    res.status(apiError.status).json({ ok: false, error: apiError.error });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Zero API running at http://localhost:${port}`);
});
