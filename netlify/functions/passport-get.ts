
import type { Handler } from "@netlify/functions";

import admin from "firebase-admin";
function init(){ if(!admin.apps.length){ admin.initializeApp({ credential: admin.credential.cert({ projectId:process.env.FIREBASE_PROJECT_ID, clientEmail:process.env.FIREBASE_CLIENT_EMAIL, privateKey:(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\n/g,"\n") } as admin.ServiceAccount) }); } return { db: admin.firestore() }; }

export const handler: Handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin":"*" };
  const { db } = init();
  const userId = (event.queryStringParameters?.userId||"").trim();
  if (!userId) return { statusCode:400, headers, body: JSON.stringify({ error:"userId required" }) };
  const topics = await db.collection("topics").where("enabled","==",true).get();
  const stampsSnap = await db.collection("passports").doc(userId).collection("stamps").get();
  const stamped = new Set(stampsSnap.docs.map(d=>d.id));
  const items = topics.docs.map(d=>{
    const t:any = d.data();
    return {
      topicCode: t.code,
      title: t.title,
      countryName: t.passport?.countryName || t.title,
      stamped: stamped.has(t.code),
      stampOn: t.passport?.stampOn || null,
      stampOff: t.passport?.stampOff || null
    };
  });
  return { statusCode:200, headers, body: JSON.stringify({ items }) };
};
