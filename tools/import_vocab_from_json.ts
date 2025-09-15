
/**
 * CLI: pnpm tsx tools/import_vocab_from_json.ts --topic T_FARM --json ./topics/T_FARM/vocab.json
 */
import fs from "node:fs";
import yargs from "yargs";
import admin from "firebase-admin";

const argv = (yargs(process.argv.slice(2)) as any)
  .option("topic", { type: "string", demandOption: true })
  .option("json", { type: "string", demandOption: true })
  .argv;

function initAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\n/g, "\n"),
      } as admin.ServiceAccount),
    });
  }
  return { db: admin.firestore() };
}

async function main() {
  const { db } = initAdmin();
  const topic = argv.topic as string;
  const items = JSON.parse(fs.readFileSync(argv.json, "utf-8"));
  const batch = db.batch();
  for (const v of items) {
    const ref = db.collection("topics").doc(topic).collection("vocab").doc(v.id);
    batch.set(ref, v, { merge:true });
  }
  await batch.commit();
  console.log("Imported vocab items:", items.length);
}

main().catch(e=>{ console.error(e); process.exit(1); });
