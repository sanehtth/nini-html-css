// netlify/functions/fs-add.js
const { getAdmin } = require("../_shared/firebaseAdmin");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return cors204();
  if (event.httpMethod !== "POST") return json({ ok: false, error: "Use POST" }, 405);

  try {
    const admin = getAdmin();
    const db = admin.firestore();
    const body = JSON.parse(event.body || "{}");

    const { collection, data, docId } = body;
    if (!collection || typeof data !== "object")
      return json({ ok: false, error: "Missing collection or data" }, 400);

    const ref = docId ? db.collection(collection).doc(docId) : db.collection(collection).doc();
    await ref.set(
      { ...data, _ts: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    return json({ ok: true, id: ref.id });
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
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}
