<!-- src/pages/RankingPage.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  collection,
  getDocs,
  query,
  doc,
  getDoc,              // ← これが無いとエラーになります
} from 'firebase/firestore'
import { db } from '../firebase'
import { entries } from '../data/entries'

// Elo（フォールバック計算用）
const INITIAL_RATING = 1500
const K = 32
function calculateElo(w, l, k = K) {
  const e = 1 / (1 + 10 ** ((l - w) / 400))
  return [Math.round(w + k * (1 - e)), Math.round(l + k * (0 - e))]
}

const rankings = ref([])
const loading = ref(true)
const fromCache = ref(false)
const updatedAt = ref(null)

onMounted(async () => {
  try {
    // 1) Functions が更新しているキャッシュを読む
    const cacheRef = doc(collection(db, 'cache'), 'ranking')
    const cacheSnap = await getDoc(cacheRef)

    if (cacheSnap.exists()) {
      const data = cacheSnap.data()
      rankings.value = (data.rankings || []).map(r => ({
        id: r.id,
        name: r.name,
        rating: r.rating
      }))
      updatedAt.value = data.updatedAt?.toDate?.() || null
      fromCache.value = true
      loading.value = false
      return
    }

    // 2) キャッシュがなければ votes からクライアント計算へフォールバック
    const rates = {}
    entries.forEach(e => { rates[e.id] = INITIAL_RATING })

    const voteSnap = await getDocs(query(collection(db, 'votes')))
    voteSnap.docs.map(d => d.data()).forEach(v => {
      const [wr, lr] = calculateElo(rates[v.winnerId], rates[v.loserId])
      rates[v.winnerId] = wr
      rates[v.loserId] = lr
    })

    rankings.value = entries
      .map(e => ({ id: e.id, name: e.name, rating: rates[e.id] }))
      .sort((a, b) => b.rating - a.rating)

  } catch (err) {
    console.error('Ranking load error:', err)
    // 失敗時も最低限 entries は出す
    rankings.value = entries.map(e => ({ id: e.id, name: e.name, rating: INITIAL_RATING }))
  } finally {
    loading.value = false
  }
})

// 「1段目1件、2段目2件…」で中央寄せ表示する配列
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
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-3 text-center">🎓 GakutteTV</h1>
    <h2 class="text-2xl font-bold mb-4 text-center">学歴ピラミッド</h2>

    <p v-if="loading" class="text-center py-10 text-gray-500">読み込み中…</p>

    <div v-else>
      <p class="text-center text-sm text-gray-500 mb-6">
        表示元：{{ fromCache ? 'サーバーキャッシュ' : 'クライアント計算' }}
        <span v-if="updatedAt">（最終更新: {{ updatedAt.toLocaleString() }}）</span>
      </p>

      <!-- ピラミッド -->
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
            class="bg-blue-100 border border-blue-300 shadow rounded-lg p-3 text-center"
          >
            <div class="font-semibold text-sm leading-tight">{{ item.name }}</div>
            <div class="text-xs text-blue-600 mt-1">{{ item.rating }} pt</div>
          </div>
        </div>
      </div>

      <p class="text-center mb-6 text-gray-600">
        ※ あくまでエンタメとしてお楽しみください。
      </p>
    </div>
  </div>
</template>

<style scoped>
/* 見た目を整える場合はここに追記 */
</style>
