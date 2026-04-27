import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID || "";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Firebase admin env vars are required.");
}

const app =
  getApps()[0] ||
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  });

export const adminAuth = getAuth(app);
export const firestore = getFirestore(app);
