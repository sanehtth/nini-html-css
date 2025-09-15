
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
  const chestId = Number(b.chestId);
  if (!sessionId) return { statusCode:400, headers, body: JSON.stringify({ error:"sessionId required" }) };
  const sRef = db.collection("game_sessions").doc(sessionId);
  const sSnap = await sRef.get();
  if (!sSnap.exists) return { statusCode:404, headers, body: JSON.stringify({ error:"session_not_found" }) };
  const s:any = sSnap.data();
  const now = Date.now();
  let awarded:any = {};
  await db.runTransaction(async trx=>{
    const progRef = db.collection("topics").doc(s.topicCode).collection("treasureProgress").doc(s.userId);
    const progSnap = await trx.get(progRef);
    const arr:number[] = progSnap.exists ? ((progSnap.data() as any).found||[]) : [];
    if (!arr.includes(chestId)) arr.push(chestId);
    arr.sort((a,b)=>a-b);
    trx.set(progRef, { found: arr, updatedAt: now, grandAwarded: progSnap.exists ? (progSnap.data() as any).grandAwarded||false : false }, { merge:true });

    const wRef = db.collection("wallets_users").doc(s.userId);
    const wSnap = await trx.get(wRef);
    const wd:any = wSnap.exists ? wSnap.data() : { shards:{} };
    wd.shards = wd.shards||{};
    wd.shards[s.topicCode] = Number(wd.shards[s.topicCode]||0) + 1;
    awarded = { shards: { [s.topicCode]: 1 } };
    trx.set(wRef, wd, { merge:true });

    const tDoc = await trx.get(db.collection("topics").doc(s.topicCode));
    const treasureCount = Number((tDoc.data() as any)?.treasureCount||4);
    if (arr.length >= treasureCount){
      const pSnap = await trx.get(progRef);
      const pd:any = pSnap.data()||{};
      if (!pd.grandAwarded){
        pd.grandAwarded = true;
        trx.set(progRef, pd, { merge:true });
        const prize = (tDoc.data() as any)?.grandPrize || { type:"avatar", code:`avatar_${s.topicCode.toLowerCase()}` };
        trx.set(db.collection("unlocks").doc(`${s.userId}_${String(prize.type)}_${String(prize.code)}`), { userId:s.userId, ...prize, at: now }, { merge:true });
        awarded["grand"] = prize;
      }
    }

    trx.set(db.collection("nv").doc(String(now)), { type:"u5_chest_collect", sessionId, userId:s.userId, chestId, awarded, at: now }, { merge:false });
  }});

  return { statusCode:200, headers, body: JSON.stringify({ ok:true, awarded }) };
};
