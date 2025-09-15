// netlify/functions/env-check.js
exports.handler = async () => {
    const keys = [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
      "FIREBASE_STORAGE_BUCKET",
      "STORAGE_BUCKET",
      "ADMIN_SECRET",
    ];
    const report = {};
    for (const k of keys) report[k] = !!(process.env[k] && String(process.env[k]).trim());
  
    const ok =
      report.FIREBASE_PROJECT_ID &&
      report.FIREBASE_CLIENT_EMAIL &&
      report.FIREBASE_PRIVATE_KEY &&
      (report.FIREBASE_STORAGE_BUCKET || report.STORAGE_BUCKET);
  
    const pkRaw = process.env.FIREBASE_PRIVATE_KEY || "";
    const pkNorm = pkRaw.replace(/\\n/g, "\n");
    const preview =
      pkNorm && pkNorm.includes("BEGIN")
        ? { first: pkNorm.split("\n")[0], last: pkNorm.split("\n").slice(-2, -1)[0] }
        : null;
  
    return json({
      ok,
      keys: report,
      privateKeyPreview: preview,
      note:
        "ENV OK khi 4 biến Firebase đều true. PRIVATE_KEY cần replace(/\\\\n/g,'\\n') khi dùng.",
    });
  };
  
  function json(obj, statusCode = 200) {
    return {
      statusCode,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(obj, null, 2),
    };
  }
  