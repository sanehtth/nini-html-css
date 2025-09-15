
import type { Handler } from "@netlify/functions";

import admin from "firebase-admin";
function init(){ if(!admin.apps.length){ admin.initializeApp({ credential: admin.credential.cert({ projectId:process.env.FIREBASE_PROJECT_ID, clientEmail:process.env.FIREBASE_CLIENT_EMAIL, privateKey:(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\n/g,"\n") } as admin.ServiceAccount) }); } return { db: admin.firestore() }; }

function shuffle<T>(a:T[]){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
export const handler: Handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type" };
  if (event.httpMethod==="OPTIONS") return { statusCode:200, headers, body:"" };
  if (event.httpMethod!=="POST") return { statusCode:405, headers, body:"Method not allowed" };
  const { db } = init();
  const b = JSON.parse(event.body||"{}");
  const userId = (b.userId||"").trim();
  const topicCode = (b.topicCode||"").trim();
  if (!userId || !topicCode) return { statusCode:400, headers, body: JSON.stringify({ error:"bad request" }) };

  const scSnap = await db.collection("topics").doc(topicCode).collection("scenes").get();
  const scenes = scSnap.docs.map(d=>d.id);
  if (!scenes.length) return { statusCode:404, headers, body: JSON.stringify({ error:"no_scenes" }) };

  const bagRef = db.collection("topics").doc(topicCode).collection("sceneBags").doc(userId);
  let pickedId = "";
  await db.runTransaction(async trx=>{
    const bagSnap = await trx.get(bagRef);
    let bag:any = bagSnap.exists ? (bagSnap.data() as any) : null;
    const prev = bag?.last || null;
    let order:string[] = Array.isArray(bag?.order)? bag.order: [];
    let idx = Number(bag?.index||0);
    if (!order.length || idx>=order.length){
      order = shuffle(scenes.slice());
      if (prev && order.length>1 && order[0]===prev) order.reverse();
      idx = 0;
    }
    pickedId = order[idx];
    idx++;
    trx.set(bagRef, { order, index: idx, last: pickedId, updatedAt: Date.now() }, { merge:true });
  });

  const sceneDoc = await db.collection("topics").doc(topicCode).collection("scenes").doc(pickedId).get();
  return { statusCode:200, headers, body: JSON.stringify({ ok:true, sceneId: pickedId, scene: sceneDoc.data() }) };
};
