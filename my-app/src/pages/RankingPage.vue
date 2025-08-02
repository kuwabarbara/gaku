<!-- src/pages/RankingPage.vue -->
<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6 text-center">🏆 大学×学部ランキング</h1>
    
    <!-- ランキング一覧 -->
    <ol class="space-y-4 mb-10">
      <li
        v-for="(item, idx) in rankings"
        :key="item.id"
        class="flex justify-between items-center p-4 bg-white shadow rounded"
      >
        <div class="flex items-center space-x-4">
          <span class="text-xl font-semibold">{{ idx + 1 }}.</span>
          <span class="font-medium">{{ item.name }}</span>
        </div>
        <div class="text-blue-600 font-bold">{{ item.wins }} 票</div>
      </li>
    </ol>

    <!-- コメント欄 -->
    <div class="bg-gray-50 p-4 rounded shadow">
      <h2 class="text-xl font-bold mb-2">💬 コメント掲示板（匿名）</h2>
      <div class="space-y-2 mb-4 max-h-60 overflow-y-auto">
        <div
          v-for="(comment, index) in comments"
          :key="index"
          class="p-2 bg-white border rounded"
        >
          {{ comment.text }}
        </div>
      </div>
      <form @submit.prevent="submitComment" class="flex space-x-2">
        <input
          v-model="newComment"
          type="text"
          class="flex-1 border p-2 rounded"
          placeholder="コメントを入力..."
        />
        <button
          type="submit"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          投稿
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, addDoc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { entries } from '../data/entries'

// 学歴カードのマッピング
const entryMap = entries.reduce((map, e) => {
  map[e.id] = e.name
  return map
}, {})

// ランキングロジック
const rankings = ref([])

onMounted(async () => {
  const snap = await getDocs(collection(db, 'votes'))

  const winCounts = {}
  snap.docs.forEach(doc => {
    const { winnerId } = doc.data()
    if (!winCounts[winnerId]) winCounts[winnerId] = 0
    winCounts[winnerId]++
  })

  const list = entries.map(e => ({
    id: e.id,
    name: e.name,
    wins: winCounts[e.id] || 0
  }))
  list.sort((a, b) => b.wins - a.wins)
  rankings.value = list

  await loadComments()
})

// コメント機能
const comments = ref([])
const newComment = ref('')

async function loadComments() {
  const q = query(collection(db, 'comments'), orderBy('timestamp', 'desc'))
  const snap = await getDocs(q)
  comments.value = snap.docs.map(doc => doc.data())
}

async function submitComment() {
  if (!newComment.value.trim()) return
  await addDoc(collection(db, 'comments'), {
    text: newComment.value,
    timestamp: serverTimestamp()
  })
  newComment.value = ''
  await loadComments()
}
</script>

<style scoped>
/* 必要ならここに追加 */
</style>
