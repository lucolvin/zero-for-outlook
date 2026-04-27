import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { createClerkClient, verifyToken } from "@clerk/backend";

function readBearerToken(header?: string) {
  const value = String(header || "");
  if (!value.toLowerCase().startsWith("bearer ")) {
    throw new Error("Missing bearer token.");
  }
  return value.slice("bearer ".length).trim();
}

export async function verifyClerkBearerToken(header?: string) {
  const token = readBearerToken(header);
  const clerkSecret = process.env.CLERK_SECRET_KEY || "";
  if (!clerkSecret) {
    throw new Error("CLERK_SECRET_KEY is required.");
  }

  const payload = await verifyToken(token, {
    secretKey: clerkSecret
  });

  if (!payload || !payload.sub) {
    throw new Error("Clerk user id missing.");
  }
  return String(payload.sub);
}

export async function verifyExtensionBearerToken(
  header: string | undefined,
  _auth: Auth,
  firestore: Firestore
) {
  const token = readBearerToken(header);
  const tokenRef = firestore.collection("extensionSessions").doc(token);
  const tokenSnap = await tokenRef.get();

  if (!tokenSnap.exists) {
    throw new Error("Invalid extension token.");
  }
  const data = tokenSnap.data() || {};
  const userId = typeof data.userId === "string" ? data.userId : "";
  const expiresAt = typeof data.expiresAt === "number" ? data.expiresAt : 0;
  if (!userId || expiresAt <= Date.now()) {
    throw new Error("Expired extension token.");
  }
  return userId;
}

export async function getClerkProfileForExtensionToken(
  header: string | undefined,
  _auth: Auth,
  firestore: Firestore
) {
  const userId = await verifyExtensionBearerToken(header, _auth, firestore);
  const clerkSecret = process.env.CLERK_SECRET_KEY || "";
  if (!clerkSecret) {
    throw new Error("CLERK_SECRET_KEY is required.");
  }

  const clerk = createClerkClient({ secretKey: clerkSecret });
  const user = await clerk.users.getUser(userId);

  const firstName = (user.firstName || "").trim();
  const lastName = (user.lastName || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const displayName =
    fullName ||
    (user.username || "").trim() ||
    (user.primaryEmailAddress?.emailAddress || "").trim() ||
    "Account";

  return {
    userId,
    name: displayName,
    imageUrl: user.imageUrl || ""
  };
}
