// netlify/_shared/firebaseAdmin.js
const admin = require("firebase-admin");

let initialized = false;

function getAdmin() {
  if (initialized && admin.apps.length) return admin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.STORAGE_BUCKET ||
    `${projectId}.appspot.com`;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase credentials ENV.");
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });

  initialized = true;
  return admin;
}

module.exports = { getAdmin };
