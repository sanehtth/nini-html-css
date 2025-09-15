// netlify/functions/fs-list.js
const { getAdmin } = require("../_shared/firebaseAdmin");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return cors204();

  try {
    const admin = getAdmin();
    const db = admin.firestore();

    const qs = event.queryStringParameters || {};
    const collection = qs.collection;
    const limit = Math.min(parseInt(qs.limit || "50", 10), 200);

    if (!collection) return json({ ok: false, error: "Missing collection" }, 400);

    const snap = await db.collection(collection).limit(limit).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return json({ ok: true, items });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};

function cors204() {
  return { statusCode: 204, headers: corsHeaders(), body: "" };
}
function json(obj, statusCode = 200) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(obj) };
}
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  };
}
