// netlify/functions/leaderboard.js
const { getAdmin } = require("../_shared/firebaseAdmin");
const { json, noContent } = require("../_shared/utils");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return noContent();

  try {
    const admin = getAdmin();
    const db = admin.firestore();

    const qs = event.queryStringParameters || {};
    const timeframe = (qs.timeframe || "day").toLowerCase(); // day|week|month|year
    const kind = (qs.kind || "read").toLowerCase();          // read|video|game|all
    const metric = (qs.metric || "value").toLowerCase();     // value|leaves
    const timeKey = qs.timeKey || todayKey(timeframe);
    const limit = Math.min(parseInt(qs.limit || "20", 10), 100);

    const colMap = {
      day: "stats_day",
      week: "stats_week",
      month: "stats_month",
      year: "stats_year",
    };
    const col = colMap[timeframe];
    if (!col) return json({ ok: false, error: "Invalid timeframe" }, 400);

    let q = db.collection(col).where("timeKey", "==", timeKey);
    if (["read", "video", "game"].includes(kind)) q = q.where("kind", "==", kind);
    // Nếu "all": bỏ qua filter kind để xếp tổng mọi loại

    // Sắp theo metric
    q = q.orderBy(metric, "desc").limit(limit);
    const snap = await q.get();

    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));

    // Lấy hồ sơ hiển thị avatar/nickname nhanh (option)
    // (có thể bỏ nếu muốn giảm chi phí)
    const profIds = [...new Set(rows.map(r => r.uid).filter(Boolean))];
    const profiles = {};
    if (profIds.length) {
      const profSnap = await db.getAll(...profIds.map(id => db.collection("profiles").doc(id)));
      profSnap.forEach(doc => { if (doc.exists) profiles[doc.id] = doc.data(); });
    }

    return json({ ok: true, timeframe, timeKey, kind, metric, rows, profiles });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};

function todayKey(tf) {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth()+1).padStart(2,"0");
  const dd = String(d.getUTCDate()).padStart(2,"0");
  const jan1 = new Date(Date.UTC(yyyy,0,1));
  const dayMs = 24*60*60*1000;
  const ww = String(Math.ceil(((d-jan1)/dayMs + jan1.getUTCDay() + 1)/7)).padStart(2,"0");

  if (tf === "day")   return `${yyyy}-${mm}-${dd}`;
  if (tf === "week")  return `${yyyy}-W${ww}`;
  if (tf === "month") return `${yyyy}-${mm}`;
  return `${yyyy}`; // year
}
