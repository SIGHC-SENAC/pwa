import admin from "firebase-admin";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

function loadServiceAccountFromEnv() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 ausente no .env");

  const jsonStr = Buffer.from(b64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(jsonStr);

  if (!serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error("Service account inválido");
  }

  return serviceAccount;
}

const serviceAccount = loadServiceAccountFromEnv();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.APP_STORAGE_BUCKET,
  });
}

const db = admin.firestore();
const auth_firebase = admin.auth();
const bucket = admin.storage().bucket();

export { admin, db, auth_firebase, bucket };