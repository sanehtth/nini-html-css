// public/js/main.js
import { addVisit, listVisits, activityLog, getLeaderboard, getTopicState } from "./api.js";

// Demo: bắt đầu bằng đăng nhập ẩn danh (cho dễ test)
firebase.auth().signInAnonymously().catch(console.error);

// Gắn test nhanh
window.addEventListener("DOMContentLoaded", async () => {
  // 1) ghi activity đọc 1 trang trong topic FARM
  const log = await activityLog({
    kind: "read",
    topicId: "FARM",
    itemId: "cow-01",
    leaves: 1,
    coins: 0,
    chest: false
  });
  console.log("activityLog:", log);

  // 2) leaderboard theo ngày, top đọc nhiều nhất
  const lb = await getLeaderboard({ timeframe: "day", kind: "read", metric: "value", limit: 10 });
  console.log("leaderboard:", lb);

  // 3) tiến độ của topic FARM cho user hiện tại
  const prog = await getTopicState("FARM");
  console.log("topicState:", prog);

  // 4) ví dụ cũ: thêm & list dữ liệu
  const add = await addVisit();
  console.log("addVisit:", add);

  const list = await listVisits();
  console.log("listVisits:", list);
});
