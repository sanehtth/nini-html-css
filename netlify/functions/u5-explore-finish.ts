
import type { Handler } from "@netlify/functions";

import admin from "firebase-admin";
function init(){ if(!admin.apps.length){ admin.initializeApp({ credential: admin.credential.cert({ projectId:process.env.FIREBASE_PROJECT_ID, clientEmail:process.env.FIREBASE_CLIENT_EMAIL, privateKey:(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\n/g,"\n") } as admin.ServiceAccount) }); } return { db: admin.firestore() }; }

export const handler: Handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type" };
  if (event.httpMethod==="OPTIONS") return { statusCode:200, headers, body:"" };
  if (event.httpMethod!=="POST") return { statusCode:405, headers, body:"Method not allowed" };
  const { db } = init();
  const b = JSON.parse(event.body||"{}");
  const sessionId = (b.sessionId||"").trim();
  if (!sessionId) return { statusCode:400, headers, body: JSON.stringify({ error:"sessionId required" }) };
  const sRef = db.collection("game_sessions").doc(sessionId);
  const sSnap = await sRef.get();
  if (!sSnap.exists) return { statusCode:404, headers, body: JSON.stringify({ error:"session_not_found" }) };
  const s:any = sSnap.data();
  const now = Date.now();

  const vpSnap = await db.collection("topics").doc(s.topicCode).collection("visitProgress").doc(s.userId).get();
  const visitedCount = Number((vpSnap.data() as any)?.visitedCount||0);
  const totalScenes  = Number((vpSnap.data() as any)?.totalScenes||0);

  const tDoc  = await db.collection("topics").doc(s.topicCode).get();
  const treasureCount = Number((tDoc.data() as any)?.treasureCount||4);
  const progSnap = await db.collection("topics").doc(s.topicCode).collection("treasureProgress").doc(s.userId).get();
  const found: number[] = progSnap.exists ? ((progSnap.data() as any).found||[]) : [];
  const chestComplete = found.length >= treasureCount;

  let bonus:any = null, stampedGrade:string|null = null;
  if (totalScenes>0 && visitedCount>=totalScenes){
    const bonusLeaves = 20, bonusCoins = 10;
    await db.runTransaction(async trx=>{
      const wRef = db.collection("wallets_users").doc(s.userId);
      const wSnap = await trx.get(wRef);
      const wd:any = wSnap.exists ? wSnap.data() : {};
      wd.leaves = Number(wd.leaves||0) + bonusLeaves;
      wd.coins  = Number(wd.coins||0)  + bonusCoins;
      trx.set(wRef, wd, { merge:true });
      const stRef = db.collection("passports").doc(s.userId).collection("stamps").doc(s.topicCode);
      trx.set(stRef, { topicCode: s.topicCode, at: now, grade: "excellent", chestComplete }, { merge:true });
    });
    stampedGrade = "excellent";
    bonus = { leaves: bonusLeaves, coins: bonusCoins };
  }

  await sRef.set({ finishedAt: now }, { merge:true });
  return { statusCode:200, headers, body: JSON.stringify({ ok:true, stampedGrade, chestComplete, bonus }) };
};
