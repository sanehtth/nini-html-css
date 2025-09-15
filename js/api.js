// public/js/api.js
async function authHeader() {
    const u = firebase.auth().currentUser;
    if (!u) return {};
    const t = await u.getIdToken();
    return { Authorization: "Bearer " + t };
  }
  
  export async function addVisit() {
    const res = await fetch("/.netlify/functions/fs-add", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({
        collection: "visits",
        data: { at: Date.now() }
      })
    });
    return res.json();
  }
  
  export async function listVisits() {
    const res = await fetch("/.netlify/functions/fs-list?collection=visits&limit=20", {
      headers: await authHeader()
    });
    return res.json();
  }
  
  // Các API mới bạn vừa thêm:
  export async function activityLog(payload) {
    const res = await fetch("/.netlify/functions/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
  
  export async function getLeaderboard(qs) {
    const p = new URLSearchParams(qs).toString();
    const res = await fetch(`/.netlify/functions/leaderboard?${p}`);
    return res.json();
  }
  
  export async function getTopicState(topicId) {
    const res = await fetch(`/.netlify/functions/topic-state?topicId=${encodeURIComponent(topicId)}`, {
      headers: await authHeader()
    });
    return res.json();
  }
  