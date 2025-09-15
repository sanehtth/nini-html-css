
import type { Handler } from "@netlify/functions";

import admin from "firebase-admin";
function init(){ if(!admin.apps.length){ admin.initializeApp({ credential: admin.credential.cert({ projectId:process.env.FIREBASE_PROJECT_ID, clientEmail:process.env.FIREBASE_CLIENT_EMAIL, privateKey:(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\n/g,"\n") } as admin.ServiceAccount) }); } return { db: admin.firestore() }; }

function randInt(a:number,b:number){ return Math.floor(Math.random()*(b-a+1))+a; }
function shuffle<T>(a:T[]){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
export const handler: Handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type" };
  if (event.httpMethod==="OPTIONS") return { statusCode:200, headers, body:"" };
  if (event.httpMethod!=="POST") return { statusCode:405, headers, body:"Method not allowed" };
  const { db } = init();
  const b = JSON.parse(event.body||"{}");
  const userId = (b.userId||"").trim();
  const topicCode = (b.topicCode||"T_FARM").trim();
  const gameCode = "G_NINI_TRIP_FARM_U5";
  const batchSize = Math.max(10, Math.min(15, Number(b.batchSize||randInt(10,15))));
  if (!userId) return { statusCode:400, headers, body: JSON.stringify({ error:"userId required" }) };

  const pickResp = await fetch("/.netlify/functions/ninitrip-pick-scene", {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ userId, topicCode })
  }).then(r=>r.json()).catch(()=>null);
  if (!pickResp || !pickResp.ok) return { statusCode:400, headers, body: JSON.stringify({ error:"scene_pick_failed" }) };
  const scene = pickResp.scene;

  const ids = (scene.hotspots||[]).map((h:any)=>h.targetId);
  const shuffled = shuffle(Array.from(new Set(ids)));
  const selected = shuffled.slice(0, Math.min(batchSize, shuffled.length));
  if (selected.length < 3) return { statusCode:400, headers, body: JSON.stringify({ error:"scene_has_too_few_hotspots" }) };

  const vSnap = await db.collection("topics").doc(topicCode).collection("vocab").get();
  const vmap = new Map(vSnap.docs.map(d=>[d.id, d.data()]));

  const now = Date.now();
  const sessionId = `${gameCode}_${userId}_${now}`;
  await db.collection("game_sessions").doc(sessionId).set({
    sessionId, userId, gameCode, topicCode,
    sceneId: pickResp.sceneId,
    selectedIds: selected,
    orderIndex: 0,
    correct: 0, wrong: 0, skips: 0,
    leavesAwarded: 0, coinsAwarded: 0,
    chestPlan: null,
    startedAt: now, finishedAt: 0
  }, { merge:false });

  const intro = "Chào mừng bé đến thăm nông trại của bác nông dân! ...";

  const firstId = selected[0];
  const target = vmap.get(firstId) || null;
  await db.collection("nv").doc(String(now)).set({ type:"ninitrip_start", userId, topicCode, gameCode, sessionId, sceneId: pickResp.sceneId, at: now }, { merge:false });

  return { statusCode:200, headers, body: JSON.stringify({
    ok:true, sessionId, scene: scene, batchSize, intro,
    firstTarget: target
  }) };
};
