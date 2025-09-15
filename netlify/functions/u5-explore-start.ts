
import type { Handler } from "@netlify/functions";

import admin from "firebase-admin";
function init(){ if(!admin.apps.length){ admin.initializeApp({ credential: admin.credential.cert({ projectId:process.env.FIREBASE_PROJECT_ID, clientEmail:process.env.FIREBASE_CLIENT_EMAIL, privateKey:(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\n/g,"\n") } as admin.ServiceAccount) }); } return { db: admin.firestore() }; }

function chance(p:number){ return Math.random() < p; }
export const handler: Handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type" };
  if (event.httpMethod==="OPTIONS") return { statusCode:200, headers, body:"" };
  if (event.httpMethod!=="POST") return { statusCode:405, headers, body:"Method not allowed" };
  const { db } = init();
  const b = JSON.parse(event.body||"{}");
  const userId = (b.userId||"").trim();
  const topicCode = (b.topicCode||"").trim();
  if (!userId || !topicCode) return { statusCode:400, headers, body: JSON.stringify({ error:"bad request" }) };

  const pickResp = await fetch("/.netlify/functions/ninitrip-pick-scene", {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ userId, topicCode })
  }).then(r=>r.json()).catch(()=>null);
  if (!pickResp || !pickResp.ok) return { statusCode:400, headers, body: JSON.stringify({ error:"scene_pick_failed" }) };

  const vpRef = db.collection("topics").doc(topicCode).collection("visitProgress").doc(userId);
  let visitedCount = 0, totalScenes = 0, topicComplete = false;
  await db.runTransaction(async trx=>{
    const vpSnap = await trx.get(vpRef);
    const scSnap = await db.collection("topics").doc(topicCode).collection("scenes").get();
    totalScenes = scSnap.size;
    let set = new Set<string>(vpSnap.exists ? ((vpSnap.data() as any).visitedIds||[]) : []);
    if (!set.has(pickResp.sceneId)) set.add(pickResp.sceneId);
    visitedCount = set.size;
    topicComplete = visitedCount >= totalScenes && totalScenes>0;
    trx.set(vpRef, { visitedIds: Array.from(set), visitedCount, totalScenes, updatedAt: Date.now() }, { merge:true });
  });

  const tDoc = await db.collection("topics").doc(topicCode).get();
  const treasureCount = Number((tDoc.data() as any)?.treasureCount||4);
  const chanceSpawn = Number((tDoc.data() as any)?.treasureSpawnChance||0.25);
  const progRef = db.collection("topics").doc(topicCode).collection("treasureProgress").doc(userId);
  const prog = await progRef.get();
  const found: number[] = prog.exists ? ((prog.data() as any).found||[]) : [];
  let chest:any = null;
  if (found.length < treasureCount && chance(chanceSpawn)) {
    const remain = Array.from({length: treasureCount}, (_,i)=>i).filter(i=>!found.includes(i));
    if (remain.length) {
      const pick = remain[Math.floor(Math.random()*remain.length)];
      chest = { chestId: pick };
    }
  }

  const now = Date.now();
  const sessionId = `U5EXP_${userId}_${now}`;
  await db.collection("game_sessions").doc(sessionId).set({
    sessionId, userId, topicCode, mode:"U5_EXPLORE",
    sceneId: pickResp.sceneId,
    chest, startedAt: now, finishedAt: 0
  }, { merge:false });

  const intro = "NiNi: Cùng đi khám phá nào! Chạm vào những nơi bé thích để nghe và xem điều kỳ thú nhé.";

  return { statusCode:200, headers, body: JSON.stringify({
    ok:true, sessionId, scene: pickResp.scene, chest, intro, visitedCount, totalScenes, topicComplete
  }) };
};
