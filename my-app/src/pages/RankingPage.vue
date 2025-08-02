<script setup>
import { ref, onMounted } from 'vue'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { entries } from '../data/entries'

// 初期レーティング値
const INITIAL_RATING = 1500
const K = 32

// レーティング計算関数
function calculateElo(winnerRating, loserRating, k = K) {
  const expectedWin = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400))
  const newWinner = winnerRating + k * (1 - expectedWin)
  const newLoser = loserRating + k * (0 - (1 - expectedWin))
  return [Math.round(newWinner), Math.round(newLoser)]
}

// entriesをidで検索できるようにMap化
const entryMap = entries.reduce((map, e) => {
  map[e.id] = e.name
  return map
}, {})

const rankings = ref([])
const comments = ref([])
const newComment = ref('')
const isSubmitting = ref(false)

onMounted(async () => {
  // 初期レーティングセット
  const ratings = {}
  entries.forEach(entry => {
    ratings[entry.id] = INITIAL_RATING
  })

  // votesを時系列順に取得（timestampがあれば）
  const snap = await getDocs(query(collection(db, 'votes')))
  const votes = snap.docs.map(doc => doc.data())

  // Eloレートを更新
  for (const vote of votes) {
    const { winnerId, loserId } = vote
    const [newWinner, newLoser] = calculateElo(
      ratings[winnerId],
      ratings[loserId]
    )
    ratings[winnerId] = newWinner
    ratings[loserId] = newLoser
  }

  // リスト化してソート
  const list = entries.map(e => ({
    id: e.id,
    name: e.name,
    rating: ratings[e.id]
  }))
  list.sort((a, b) => b.rating - a.rating)
  rankings.value = list

  // コメント取得
  const commentSnap = await getDocs(collection(db, 'comments'))
  comments.value = commentSnap.docs.map(doc => doc.data())
})

async function submitComment() {
  if (!newComment.value.trim()) return
  isSubmitting.value = true
  try {
    await db.collection('comments').add({
      text: newComment.value,
      createdAt: new Date()
    })
    comments.value.push({ text: newComment.value })
    newComment.value = ''
  } catch (err) {
    alert('コメント送信に失敗しました')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6 text-center">🏆 学歴ランキング（Elo方式）</h1>

    <ol class="space-y-4 mb-10">
      <li
        v-for="(item, idx) in rankings"
        :key="item.id"
        class="flex justify-between items-center p-4 bg-white shadow rounded hover:bg-gray-50 transition"
      >
        <div class="flex items-center space-x-3">
          <span class="text-lg font-bold">{{ idx + 1 }}.</span>
          <span class="font-medium">{{ item.name }}</span>
        </div>
        <span class="text-blue-600 font-bold text-sm">{{ item.rating }}pt</span>
      </li>
    </ol>

    <h2 class="text-xl font-bold mb-2">💬 コメント掲示板</h2>

    <div class="mb-4">
      <textarea
        v-model="newComment"
        class="w-full p-2 border rounded resize-none"
        rows="3"
        placeholder="学歴について自由にコメントしてください（例: ○○学部最強！）"
      ></textarea>
      <button
        :disabled="isSubmitting"
        @click="submitComment"
        class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        コメント送信
      </button>
    </div>

    <ul class="space-y-2">
      <li
        v-for="(comment, i) in comments"
        :key="i"
        class="bg-gray-100 p-3 rounded text-sm"
      >
        {{ comment.text }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 必要に応じて追加 */
</style>
