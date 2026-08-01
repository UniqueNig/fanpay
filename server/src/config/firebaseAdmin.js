import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env.js";

function loadServiceAccount() {
  if (env.firebaseServiceAccountJson) return JSON.parse(env.firebaseServiceAccountJson);
  return JSON.parse(readFileSync(env.firebaseServiceAccountPath, "utf8"));
}

const serviceAccount = loadServiceAccount();

const app = initializeApp({
  credential: cert(serviceAccount),
});

export const firebaseAuth = getAuth(app);
// Admin SDK access bypasses firestore.rules entirely (trusted server
// context) — used by services/chatListener.js to watch for new customer
// messages and post AI replies, same project/database the client SDK
// (src/firebase.js) reads and writes through.
export const firestoreDb = getFirestore(app);
