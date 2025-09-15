
import type { Handler } from "@netlify/functions";

import admin from "firebase-admin";
function init(){ if(!admin.apps.length){ admin.initializeApp({ credential: admin.credential.cert({ projectId:process.env.FIREBASE_PROJECT_ID, clientEmail:process.env.FIREBASE_CLIENT_EMAIL, privateKey:(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\n/g,"\n") } as admin.ServiceAccount) }); } return { db: admin.firestore() }; }

export const handler: Handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type" };
  if (event.httpMethod==="OPTIONS") return { statusCode:200, headers, body:"" };
  if (event.httpMethod!=="POST") return { statusCode:405, headers, body:"Method not allowed" }};
  const { db } = init();
  const b = JSON.parse(event.body||"{}");
  const sessionId = (b.sessionId||"").trim();
  const targetId = (b.targetId||"").trim();
  if (!sessionId || !targetId) return { statusCode:400, headers, body: JSON.stringify({ error:"bad request" }) };
  const sSnap = await db.collection("game_sessions").doc(sessionId).get();
  if (!sSnap.exists) return { statusCode:404, headers, body: JSON.stringify({ error:"session_not_found" }) };
  const s:any = sSnap.data();
  const vSnap = await db.collection("topics").doc(s.topicCode).collection("vocab").doc(targetId).get();
  const v:any = vSnap.exists ? vSnap.data() : null;
  await db.collection("nv").doc(String(Date.now())).set({ type:"u5_tap", sessionId, userId:s.userId, targetId }, { merge:false });
  return { statusCode:200, headers, body: JSON.stringify({ ok:true, speak: v?.en||"", sound: v?.sound_en||null }) };
};
