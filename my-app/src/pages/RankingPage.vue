<script setup>
import { ref, onMounted, computed } from 'vue'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import { entries } from '../data/entries'

// ランキングデータ
const rankings = ref([])

onMounted(async () => {
  const snap = await getDocs(collection(db, 'votes'))
  const winCounts = {}
  snap.docs.forEach(doc => {
    const { winnerId } = doc.data()
    winCounts[winnerId] = (winCounts[winnerId] || 0) + 1
  })
  const list = entries.map(e => ({
    id: e.id,
    name: e.name,
    wins: winCounts[e.id] || 0
  }))
  list.sort((a, b) => b.wins - a.wins)
  rankings.value = list
})

// 進捗バー計算用の最大票数
const maxWins = computed(() => Math.max(1, ...rankings.value.map(r => r.wins)))
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-4xl font-bold text-center mb-8">🏆 大学×学部ランキング</h1>
      <ul class="space-y-4">
        <li
          v-for="(item, idx) in rankings"
          :key="item.id"
          class="flex items-center bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition"
        >
          <div class="w-12 text-center text-2xl">
            <template v-if="idx === 0">🥇</template>
            <template v-else-if="idx === 1">🥈</template>
            <template v-else-if="idx === 2">🥉</template>
            <template v-else>{{ idx + 1 }}</template>
          </div>
          <div class="flex-1 mx-4">
            <div class="font-semibold text-lg">{{ item.name }}</div>
            <div class="w-full bg-gray-200 h-2 rounded mt-2 overflow-hidden">
              <div
                class="h-full bg-blue-500"
                :style="{ width: (item.wins / maxWins * 100) + '%' }"
              ></div>
            </div>
          </div>
          <div class="w-16 text-right font-bold text-blue-600">{{ item.wins }}票</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* リストアイテムのホバーアニメーション */
li:hover {
  transform: translateY(-2px);
  transition: transform 0.2s;
}
</style>
