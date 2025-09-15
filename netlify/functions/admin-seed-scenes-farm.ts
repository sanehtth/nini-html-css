
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
  if (!actorId) return { statusCode:400, headers, body: JSON.stringify({ error:"actorId required" }) };
  const topicCode = "T_FARM";
  const scenes = [
    {
      id:"S_FARM_01",
      title:"Chuồng bò & ao vịt",
      image:{
        low:"https://placehold.co/640x360?text=Farm+01",
        mid:"https://placehold.co/1280x720?text=Farm+01",
        high:"https://placehold.co/1920x1080?text=Farm+01"
      },
      hotspots:[
        { targetId:"cow", shape:"rect", xywh:[0.10,0.35,0.18,0.25] },
        { targetId:"duck", shape:"rect", xywh:[0.62,0.62,0.10,0.10] },
        { targetId:"barn", shape:"rect", xywh:[0.72,0.20,0.18,0.28] }
      ]
    }
  ];
  const batch = db.batch();
  for (const s of scenes){
    const ref = db.collection("topics").doc(topicCode).collection("scenes").doc(s.id);
    batch.set(ref, s, { merge:true });
  }
  await batch.commit();
  return { statusCode:200, headers, body: JSON.stringify({ ok:true, topicCode, seeded: scenes.length }) };
};
