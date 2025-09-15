// netlify/_shared/utils.js
function corsHeaders() {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Content-Type": "application/json; charset=utf-8",
    };
  }
  function json(data, statusCode = 200) {
    return { statusCode, headers: corsHeaders(), body: JSON.stringify(data) };
  }
  function noContent() {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  function parseBody(event) {
    try { return JSON.parse(event.body || "{}"); } catch { return {}; }
  }
  
  /** timeKey theo timezone UTC (dễ tổng hợp) */
  function timeKeys(ts = Date.now()) {
    const d = new Date(ts);
    // YYYY-MM-DD, YYYY-WW, YYYY-MM, YYYY
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
  
    // week number (ISO-ish, đơn giản hoá)
    const jan1 = new Date(Date.UTC(yyyy, 0, 1));
    const dayMs = 24 * 60 * 60 * 1000;
    const week = Math.ceil(((d - jan1) / dayMs + jan1.getUTCDay() + 1) / 7);
    const ww = String(week).padStart(2, "0");
  
    return {
      day:   `${yyyy}-${mm}-${dd}`,
      week:  `${yyyy}-W${ww}`,
      month: `${yyyy}-${mm}`,
      year:  `${yyyy}`,
      ts,
    };
  }
  
  module.exports = { json, noContent, parseBody, timeKeys, corsHeaders };
  