
/**
 * CLI: pnpm tsx tools/import_scenes_from_json.ts --topic T_FARM --json ./topics/T_FARM/scenes/scenes.farm.json --mediaDir ./topics/T_FARM/images/src
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import yargs from "yargs";
import admin from "firebase-admin";

const argv = (yargs(process.argv.slice(2)) as any)
  .option("topic", { type: "string", demandOption: true })
  .option("json", { type: "string", demandOption: true })
  .option("mediaDir", { type: "string", demandOption: true })
  .option("quality", { type: "number", default: 80 })
  .argv;

function initAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\n/g, "\n"),
      } as admin.ServiceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
  }
  return { db: admin.firestore(), bucket: admin.storage().bucket() };
}

const uploadBuffer = async (bucket:any, dst:string, buf:Buffer, contentType:string, cache="public, max-age=31536000, immutable")=>{
  const file = bucket.file(dst);
  await file.save(buf, { contentType, public: true, metadata: { cacheControl: cache } });
  const [url] = await file.getSignedUrl({ action: "read", expires: "03-01-2099" });
  return { path: dst, url };
};

async function main(){
  const { db, bucket } = initAdmin();
  const topic = argv.topic as string;
  const scenesDoc = JSON.parse(fs.readFileSync(argv.json, "utf-8"));
  const q = Number(argv.quality||80);
  for (const s of scenesDoc.scenes){
    const src = path.join(argv.mediaDir as string, s.image);
    const baseName = path.parse(s.image).name;
    const raw = fs.readFileSync(src);
    const h = crypto.createHash("sha256").update(raw).digest("hex").slice(0,8);

    const low = await sharp(raw).resize(640, 360, { fit:"cover" }).webp({ quality: Math.max(72, q-8) }).toBuffer();
    const mid = await sharp(raw).resize(1280, 720, { fit:"cover" }).webp({ quality: q-4 }).toBuffer();
    const high = await sharp(raw).resize(1920, 1080, { fit:"cover" }).webp({ quality: q }).toBuffer();

    const pLow  = `topics/${topic}/scenes/${baseName}_${h}_640.webp`;
    const pMid  = `topics/${topic}/scenes/${baseName}_${h}_1280.webp`;
    const pHigh = `topics/${topic}/scenes/${baseName}_${h}_1920.webp`;

    const uLow  = await uploadBuffer(bucket, pLow,  low,  "image/webp");
    const uMid  = await uploadBuffer(bucket, pMid,  mid,  "image/webp");
    const uHigh = await uploadBuffer(bucket, pHigh, high, "image/webp");

    const doc = {
      id: s.id,
      title: s.title || baseName,
      image: { low: uLow.url, mid: uMid.url, high: uHigh.url },
      image_hash: h,
      hotspots: s.hotspots || [],
      updatedAt: Date.now()
    };
    await db.collection("topics").doc(topic).collection("scenes").doc(s.id).set(doc, { merge: true });
    console.log("uploaded scene:", s.id);
  }
  console.log("Done scenes upload.");
}

main().catch(e=>{ console.error(e); process.exit(1); });
