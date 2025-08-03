<!-- src/pages/RankingPage.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '../firebase'
import { entries } from '../data/entries'

const INITIAL_RATING = 1500
const K = 32
function calculateElo(w, l, k = K) {
  const e = 1 / (1 + 10 ** ((l - w) / 400))
  return [
    Math.round(w + k * (1 - e)),
    Math.round(l + k * (0 - e))
  ]
}

const rankings = ref([])
const comments = ref([])
const newComment = ref('')
const isSubmitting = ref(false)

onMounted(async () => {
  // Eloレート初期化
  const rates = {}
  entries.forEach(e => { rates[e.id] = INITIAL_RATING })

  // Firestoreからvotes取得→Elo更新
  const voteSnap = await getDocs(query(collection(db, 'votes')))
  voteSnap.docs.map(d => d.data()).forEach(v => {
    const [wr, lr] = calculateElo(rates[v.winnerId], rates[v.loserId])
    rates[v.winnerId] = wr
    rates[v.loserId]   = lr
  })

  // ソートしてランキング確定
  rankings.value = entries
    .map(e => ({ id: e.id, name: e.name, rating: rates[e.id] }))
    .sort((a, b) => b.rating - a.rating)

  // コメント取得
  const cSnap = await getDocs(collection(db, 'comments'))
  comments.value = cSnap.docs.map(d => d.data())
})

// 「1行目に1件、2行目に2件…」の配列を作る
const pyramidRows = computed(() => {
  const rows = []
  let idx = 0, size = 1
  while (idx < rankings.value.length) {
    rows.push(rankings.value.slice(idx, idx + size))
    idx += size
    size += 1
  }
  return rows
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
  } catch {
    alert('コメント送信に失敗しました')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6 text-center">🎓 学歴ピラミッド</h1>

    <!-- 各行ごとに1,2,3…列を設定して中央寄せ -->
    <div class="space-y-6 mb-10">
      <div
        v-for="(row, i) in pyramidRows"
        :key="i"
        :style="{
          display: 'grid',
          gridTemplateColumns: `repeat(${row.length}, 8rem)`,
          justifyContent: 'center',
          gap: '1rem'
        }"
      >
        <div
          v-for="item in row"
          :key="item.id"
          class="bg-blue-100 border border-blue-300 shadow-lg rounded-lg p-3 text-center"
        >
          <div class="font-semibold">{{ item.name }}</div>
          <div class="text-sm text-blue-600 mt-1">{{ item.rating }} pt</div>
        </div>
      </div>
    </div>

    <!-- コメント掲示板 -->
    <h2 class="text-xl font-bold mb-2">💬 コメント掲示板</h2>
    <textarea
      v-model="newComment"
      class="w-full p-2 border rounded resize-none mb-2"
      rows="3"
      placeholder="学歴について自由にコメントしてね"
    ></textarea>
    <button
      :disabled="isSubmitting"
      @click="submitComment"
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mb-6"
    >
      コメント送信
    </button>
    <ul class="space-y-2">
      <li
        v-for="(c, idx) in comments"
        :key="idx"
        class="bg-gray-100 p-3 rounded text-sm"
      >
        {{ c.text }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 
  ・gridTemplateColumns を動的に変えることで必ず改行され、
    1行目1列、2行目2列、3行目3列…となります。
  ・justifyContent: center で各行を中央寄せ。
  ・カード幅8rem固定なので見た目も揃います。
*/
</style>
