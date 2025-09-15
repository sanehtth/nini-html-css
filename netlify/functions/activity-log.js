// netlify/functions/activity-log.js
const { getAdmin, verifyIdToken } = require("../_shared/firebaseAdmin");
const { json, noContent, parseBody, timeKeys } = require("../_shared/utils");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return noContent();
  if (event.httpMethod !== "POST") return json({ ok: false, error: "Use POST" }, 405);

  try {
    const admin = getAdmin();
    const db = admin.firestore();

    // Client gửi kèm Firebase ID token (đã login) trong header: Authorization: Bearer <token>
    const auth = event.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const uid = await verifyIdToken(token);

    const body = parseBody(event);
    const {
      kind,           // "read" | "video" | "game"
      topicId,        // vd: "FARM"
      itemId,         // vd: "cow-01" hay "scene-12"
      leaves = 0,     // Lá (XP)
      coins = 0,      // Xu
      chest = false,  // Có nhặt rương?
      correct = null, // cho game: đúng/sai
      meta = {}       // thêm info tuỳ ý
    } = body;

    if (!["read", "video", "game"].includes(kind))
      return json({ ok: false, error: "Invalid kind" }, 400);
    if (!topicId || !itemId) return json({ ok: false, error: "Missing topicId/itemId" }, 400);

    const now = Date.now();
    const { day, week, month, year } = timeKeys(now);

    // 1) Lưu log hoạt động
    const actRef = db.collection("activities").doc();
    await actRef.set({
      uid, kind, topicId, itemId, leaves, coins, chest, correct, meta,
      ts: admin.firestore.FieldValue.serverTimestamp(),
      day, week, month, year,
    });

    // 2) Cập nhật hồ sơ tổng
    const profRef = db.collection("profiles").doc(uid);
    await profRef.set({
      totals: {
        reads:  admin.firestore.FieldValue.increment(kind === "read"  ? 1 : 0),
        videos: admin.firestore.FieldValue.increment(kind === "video" ? 1 : 0),
        games:  admin.firestore.FieldValue.increment(kind === "game"  ? 1 : 0),
        leaves: admin.firestore.FieldValue.increment(leaves || 0),
        coins:  admin.firestore.FieldValue.increment(coins  || 0),
        chests: admin.firestore.FieldValue.increment(chest ? 1 : 0),
      },
      _upd: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 3) Cập nhật tiến độ theo topic
    const topicRef = profRef.collection("topics").doc(topicId);
    await topicRef.set({
      items: { [itemId]: { last: now, kind, correct } },
      leaves: admin.firestore.FieldValue.increment(leaves || 0),
      coins:  admin.firestore.FieldValue.increment(coins  || 0),
      chests: admin.firestore.FieldValue.increment(chest ? 1 : 0),
      _upd: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 4) Cập nhật stats cho leaderboard
    // Cấu trúc: stats_day (hoặc _week,_month,_year) / docId= `${timeKey}_${kind}_${uid}`
    const updates = [
      ["stats_day",   day],
      ["stats_week",  week],
      ["stats_month", month],
      ["stats_year",  year],
    ];

    const inc = admin.firestore.FieldValue.increment(1);
    const incLeaves = admin.firestore.FieldValue.increment(leaves || 0);

    const batch = db.batch();
    for (const [col, key] of updates) {
      const id = `${key}_${kind}_${uid}`;
      const ref = db.collection(col).doc(id);
      batch.set(ref, {
        timeKey: key,
        kind,
        uid,
        value: inc,          // đếm số hoạt động
        leaves: incLeaves,   // tổng lá
        _upd: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();

    return json({ ok: true, id: actRef.id });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};
