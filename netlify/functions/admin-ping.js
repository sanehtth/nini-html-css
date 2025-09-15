// GET /.netlify/functions/admin-ping?secret=YOUR_SECRET
exports.handler = async (event) => {
    const qs = new URLSearchParams(event.queryStringParameters || {});
    const input = qs.get("secret") || "";
    const secret = process.env.ADMIN_SECRET || "";
  
    const ok = secret && input && input === secret;
  
    return {
      statusCode: ok ? 200 : 401,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(
        ok
          ? { ok: true, role: "admin", msg: "Admin secret verified." }
          : { ok: false, error: "Unauthorized or missing ADMIN_SECRET." },
        null,
        2
      )
    };
  };
  