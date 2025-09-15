// netlify/functions/topic-state.js
const { getAdmin, verifyIdToken } = require("../_shared/firebaseAdmin");
const { json, noContent } = require("../_shared/utils");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return noContent();

  try {
    const admin = getAdmin();
    const db = admin.firestore();

    const qs = event.queryStringParameters || {};
    const topicId = qs.topicId;
    if (!topicId) return json({ ok: false, error: "Missing topicId" }, 400);

    // Lấy uid (nếu đã đăng nhập) để trả đúng tiến độ của chính người đó
    const auth = event.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const uid = await verifyIdToken(token);

    const ref = db.collection("profiles").doc(uid).collection("topics").doc(topicId);
    const doc = await ref.get();
    if (!doc.exists) return json({ ok: true, topicId, progress: null });

    return json({ ok: true, topicId, progress: doc.data() });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};
