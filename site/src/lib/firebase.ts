import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

function readRequiredEnv(name: string) {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`${name} is required for Firebase web initialization.`);
  }
  return value as string;
}

const firebaseConfig = {
  apiKey: readRequiredEnv("VITE_FIREBASE_API_KEY"),
  authDomain: readRequiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: readRequiredEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: readRequiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readRequiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readRequiredEnv("VITE_FIREBASE_APP_ID")
};

export const firebaseApp: FirebaseApp =
  getApps()[0] ?? initializeApp(firebaseConfig);
