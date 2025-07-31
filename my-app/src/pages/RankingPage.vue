<script setup>

import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import { entries } from '../data/entries'  // 仮データ一覧

// Map entries by id for lookup of name
const entryMap = entries.reduce((m, e) => {
  m[e.id] = e.name
  return m
}, {})

// Reactive rankings array
const rankings = ref([])

onMounted(async () => {
  // 1. votes コレクションを全部取得
  const snap = await getDocs(collection(db, 'votes'))
  
  // 2. winnerId を集計
  const winCounts = {}
  snap.docs.forEach(doc => {
    const { winnerId } = doc.data()
    if (!winCounts[winnerId]) winCounts[winnerId] = 0
    winCounts[winnerId]++
  })
  
  // 3. entries の id をベースにランキング配列を作成
  const list = entries.map(e => ({
    id: e.id,
    name: e.name,
    wins: winCounts[e.id] || 0
  }))

  // 4. wins の多い順にソート
  list.sort((a, b) => b.wins - a.wins)

  // 5. Reactive にセット
  rankings.value = list
})
</script>

<template>
  <div class="max-w-xl mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6 text-center">🏆 大学×学部ランキング</h1>
    <ol class="space-y-4">
      <li
        v-for="(item, idx) in rankings"
        :key="item.id"
        class="flex justify-between p-4 bg-white shadow rounded"
      >
        <span class="font-medium">{{ idx + 1 }}. {{ item.name }}</span>
        <span class="text-blue-600 font-bold">{{ item.wins }}票</span>
      </li>
    </ol>
  </div>
</template>
