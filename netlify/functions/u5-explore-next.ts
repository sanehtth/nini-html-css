
import type { Handler } from "@netlify/functions";

import admin from "firebase-admin";
function init(){ if(!admin.apps.length){ admin.initializeApp({ credential: admin.credential.cert({ projectId:process.env.FIREBASE_PROJECT_ID, clientEmail:process.env.FIREBASE_CLIENT_EMAIL, privateKey:(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\n/g,"\n") } as admin.ServiceAccount) }); } return { db: admin.firestore() }; }

export const handler: Handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin":"*" };
  const { db } = init();
  const sessionId = (event.queryStringParameters?.sessionId||"").trim();
  if (!sessionId) return { statusCode:400, headers, body: JSON.stringify({ error:"sessionId required" }) };
  const sRef = db.collection("game_sessions").doc(sessionId);
  const sSnap = await sRef.get();
  if (!sSnap.exists) return { statusCode:404, headers, body: JSON.stringify({ error:"session_not_found" }) };
  const s:any = sSnap.data();
  const userId = s.userId, topicCode = s.topicCode;

  const pickResp = await fetch("/.netlify/functions/ninitrip-pick-scene", {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ userId, topicCode })
  }).then(r=>r.json()).catch(()=>null);
  if (!pickResp || !pickResp.ok) return { statusCode:400, headers, body: JSON.stringify({ error:"scene_pick_failed" }) };

  const vpRef = db.collection("topics").doc(topicCode).collection("visitProgress").doc(userId);
  let visitedCount=0, totalScenes=0, topicComplete=false;
  await db.runTransaction(async trx=>{
    const vpSnap = await trx.get(vpRef);
    const scSnap = await db.collection("topics").doc(topicCode).collection("scenes").get();
    totalScenes = scSnap.size;
    let set = new Set<string>(vpSnap.exists ? ((vpSnap.data() as any).visitedIds||[]) : []);
    if (!set.has(pickResp.sceneId)) set.add(pickResp.sceneId);
    visitedCount = set.size;
    topicComplete = visitedCount >= totalScenes && totalScenes>0;
    trx.set(vpRef, { visitedIds: Array.from(set), visitedCount, totalScenes, updatedAt: Date.now() }, { merge:true });
    trx.update(sRef, { sceneId: pickResp.sceneId });
  });

  const tDoc = await db.collection("topics").doc(topicCode).get();
  const treasureCount = Number((tDoc.data() as any)?.treasureCount||4);
  const progRef = db.collection("topics").doc(topicCode).collection("treasureProgress").doc(userId);
  const prog = await progRef.get();
  const found: number[] = prog.exists ? ((prog.data() as any).found||[]) : [];
  const chestComplete = found.length >= treasureCount;

  let awarded:any = null;
  if (chestComplete){
    const incLeaves = 1, incCoins = 1;
    await db.runTransaction(async trx=>{
      const wRef = db.collection("wallets_users").doc(userId);
      const wSnap = await trx.get(wRef);
      const wd:any = wSnap.exists ? wSnap.data() : {};
      wd.leaves = Number(wd.leaves||0) + incLeaves;
      wd.coins  = Number(wd.coins||0)  + incCoins;
      trx.set(wRef, wd, { merge:true });
    });
    awarded = { leaves: 1, coins: 1 };
  }

  return { statusCode:200, headers, body: JSON.stringify({
    ok:true, scene: pickResp.scene, visitedCount, totalScenes, topicComplete, chest: null, awarded
  }) };
};
