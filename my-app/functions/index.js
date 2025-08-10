// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// ここはお好みで（リージョン/同時実行の上限など）
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

// ---- 使い捨てでない素の投票 API（CORS 設定込み）----
exports.submitVote = onRequest(
  {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://<あなたのドメイン>",   // 本番ドメインを入れる
      ],
      methods: ["POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    },
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { winnerId, loserId } = req.body || {};
    if (!winnerId || !loserId) {
      res.status(400).send("Invalid parameters");
      return;
    }

    try {
      await db.collection("votes").add({
        winnerId,
        loserId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.status(200).send("Vote submitted");
    } catch (e) {
      console.error("Vote submission failed:", e);
      res.status(500).send("Server error");
    }
  }
);

// ---- 5分おきにランキングを計算してキャッシュ ----
const INITIAL_RATING = 1500;
const K = 32;
function calculateElo(w, l, k = K) {
  const e = 1 / (1 + 10 ** ((l - w) / 400));
  return [Math.round(w + k * (1 - e)), Math.round(l + k * (0 - e))];
}

// functions/entries.json を読み込む前提
const entries = require("./entries.json");

exports.cacheRanking = onSchedule(
  { schedule: "every 5 minutes", timeZone: "Asia/Tokyo" },
  async () => {
    const rates = {};
    entries.forEach((e) => (rates[e.id] = INITIAL_RATING));

    const snap = await db.collection("votes").get();
    snap.docs.map((d) => d.data()).forEach((v) => {
      const [wr, lr] = calculateElo(rates[v.winnerId], rates[v.loserId]);
      rates[v.winnerId] = wr;
      rates[v.loserId] = lr;
    });

    const rankings = entries
      .map((e) => ({ id: e.id, name: e.name, rating: rates[e.id] }))
      .sort((a, b) => b.rating - a.rating);

    await db.collection("cache").doc("ranking").set({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      rankings,
    });

    console.log("🏆 ランキングキャッシュ更新");
  }
);
