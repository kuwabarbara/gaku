const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // ✅ これを追加！

admin.initializeApp();
const db = admin.firestore();

exports.submitVote = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { winnerId, loserId } = req.body;

    if (!winnerId || !loserId) {
      return res.status(400).send("Invalid parameters");
    }

    try {
      await db.collection("votes").add({
        winnerId,
        loserId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).send("Vote submitted");
    } catch (e) {
      console.error("Vote submission failed:", e);
      return res.status(500).send("Server error");
    }
  });
});
