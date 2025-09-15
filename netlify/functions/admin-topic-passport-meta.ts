
import type { Handler } from "@netlify/functions";

import admin from "firebase-admin";
function init(){ if(!admin.apps.length){ admin.initializeApp({ credential: admin.credential.cert({ projectId:process.env.FIREBASE_PROJECT_ID, clientEmail:process.env.FIREBASE_CLIENT_EMAIL, privateKey:(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\n/g,"\n") } as admin.ServiceAccount) }); } return { db: admin.firestore() }; }

export const handler: Handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type" };
  if (event.httpMethod==="OPTIONS") return { statusCode:200, headers, body:"" };
  if (event.httpMethod!=="POST") return { statusCode:405, headers, body:"Method not allowed" };
  const { db } = init();
  const b = JSON.parse(event.body||"{}");
  const actorId = (b.actorId||"").trim();
  const topicCode = (b.topicCode||"").trim();
  const countryName = (b.countryName||"").trim();
  const stampOn = (b.stampOn||"").trim();
  const stampOff = (b.stampOff||"").trim();
  if (!actorId || !topicCode) return { statusCode:400, headers, body: JSON.stringify({ error:"bad request" }) };
  const a = await db.collection("admins").doc(actorId).get();
  if (!a.exists || !(a.data() as any).enabled) return { statusCode:403, headers, body: JSON.stringify({ error:"forbidden" }) };
  await db.collection("topics").doc(topicCode).set({ passport: { countryName, stampOn, stampOff } }, { merge:true });
  return { statusCode:200, headers, body: JSON.stringify({ ok:true }) };
};
