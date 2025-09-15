// netlify/functions/storage-signed-url.js
const { getAdmin } = require("../_shared/firebaseAdmin");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return cors204();
  if (event.httpMethod !== "POST") return json({ ok: false, error: "Use POST" }, 405);

  try {
    const admin = getAdmin();
    const bucket = admin.storage().bucket();

    const { path, contentType } = JSON.parse(event.body || "{}"); // vd: "avatars/u123.png"
    if (!path || !contentType)
      return json({ ok: false, error: "path & contentType required" }, 400);

    const file = bucket.file(path);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 10 * 60 * 1000, // 10 phút
      contentType,
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(path)}`;
    return json({ ok: true, uploadUrl: url, publicUrl });
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
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  };
}
