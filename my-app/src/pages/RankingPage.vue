<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  collection,
  getDocs,
  query,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { entries } from '../data/entries'

// ===== Elo（フォールバック用） =====
const INITIAL_RATING = 1500
const K = 32
function calculateElo(w, l, k = K) {
  const e = 1 / (1 + 10 ** ((l - w) / 400))
  return [Math.round(w + k * (1 - e)), Math.round(l + k * (0 - e))]
}

// ===== 画面状態 =====
const rankings = ref([])       // [{id,name,rating}]（降順）
const loading = ref(true)
const fromCache = ref(false)
const updatedAt = ref(null)

// ===== マウント時：キャッシュ優先で読み込み =====
onMounted(async () => {
  try {
    // 1) サーバーキャッシュ（/cache/ranking）を試す
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

    // 2) フォールバック：votes からクライアントでElo集計
    const rates = {}
    entries.forEach(e => { rates[e.id] = INITIAL_RATING })

    const voteSnap = await getDocs(query(collection(db, 'votes')))
    voteSnap.docs.map(d => d.data()).forEach(v => {
      const [wr, lr] = calculateElo(rates[v.winnerId], rates[v.loserId])
      rates[v.winnerId] = wr
      rates[v.loserId]   = lr
    })

    rankings.value = entries
      .map(e => ({ id: e.id, name: e.name, rating: rates[e.id] }))
      .sort((a, b) => b.rating - a.rating)

  } catch (err) {
    console.error('Ranking load error:', err)
    rankings.value = entries.map(e => ({ id: e.id, name: e.name, rating: INITIAL_RATING }))
  } finally {
    loading.value = false
  }
})

// ===== 段（バンド）に分割 =====
// 例：上から [5, 10, 15, 20, 30, 残り] 件で段を作る
const BAND_SIZES = [5, 10, 15, 20, 30] // 残りは自動
const BAND_LABELS = ['SS', 'S', 'A', 'B', 'C', 'D'] // 表示ラベル
// 段ごとの背景色（FC2風の濃→薄グラデーションを意識）
const BAND_CLASSES = [
  'tier-ss', // SS
  'tier-s',  // S
  'tier-a',  // A
  'tier-b',  // B
  'tier-c',  // C
  'tier-d',  // D
]

const bands = computed(() => {
  const list = rankings.value
  const out = []
  let start = 0
  for (let i = 0; i < BAND_SIZES.length; i++) {
    const size = BAND_SIZES[i]
    if (start >= list.length) break
    out.push(list.slice(start, Math.min(start + size, list.length)))
    start += size
  }
  if (start < list.length) {
    out.push(list.slice(start)) // 残り全部
  }
  return out
})
</script>

<template>
  <div class="max-w-5xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-2 text-center">🎓 GakutteTV</h1>
    <h2 class="text-2xl font-bold mb-6 text-center">学歴ランキング（段表示）</h2>

    <p v-if="loading" class="text-center py-10 text-gray-500">読み込み中…</p>

    <div v-else>
      <p class="text-center text-xs text-gray-500 mb-6">
        表示元：{{ fromCache ? 'サーバーキャッシュ' : 'クライアント計算' }}
        <span v-if="updatedAt">（最終更新: {{ updatedAt.toLocaleString() }}）</span>
      </p>

      <!-- 段（バンド）表示：ラベル + 横並びボックス -->
      <div class="space-y-5">
        <div
          v-for="(row, idx) in bands"
          :key="idx"
          class="band-row"
        >
          <div class="band-label" :class="BAND_CLASSES[idx] || BAND_CLASSES[BAND_CLASSES.length - 1]">
            {{ BAND_LABELS[idx] || BAND_LABELS[BAND_LABELS.length - 1] }}
          </div>

          <div class="band-items">
            <div
              v-for="item in row"
              :key="item.id"
              class="uni-card"
              :class="BAND_CLASSES[idx] || BAND_CLASSES[BAND_CLASSES.length - 1]"
              :title="`${item.name} / ${item.rating}pt`"
            >
              <div class="uni-name">{{ item.name }}</div>
              <div class="uni-score">{{ item.rating }}pt</div>
            </div>
          </div>
        </div>
      </div>

      <p class="text-center mt-8 text-gray-500 text-sm">
        ※ 表示は投票結果に基づく独自指標（Elo）です。エンタメとしてお楽しみください。
      </p>
    </div>
  </div>
</template>

<style scoped>
/* 段（バンド）レイアウト */
.band-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* 左側の段ラベル（SS/S/A/B/C/D） */
.band-label {
  min-width: 56px;
  height: 56px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 6px 14px rgba(0,0,0,0.08);
  user-select: none;
}

/* 右側：大学ボックスの横並び */
.band-items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
}

/* 大学ボックス */
.uni-card {
  display: grid;
  align-items: center;
  justify-items: center;
  grid-template-rows: auto auto;
  padding: 10px 14px;
  min-width: 160px;
  border-radius: 10px;
  background: #f5f7fb;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 4px 10px rgba(0,0,0,0.06);
  transition: transform .12s ease, box-shadow .12s ease;
  text-align: center;
}
.uni-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.08);
}
.uni-name {
  font-weight: 600;
  font-size: 14px;
  color: #1f2937;
  line-height: 1.2;
}
.uni-score {
  font-size: 12px;
  color: #2563eb;
  margin-top: 4px;
}

/* 段ごとの色（濃→薄） */
.tier-ss {
  background: linear-gradient(135deg, #1f4ed8, #2563eb); /* indigo-700 → blue-600 */
  border-color: rgba(37, 99, 235, 0.15);
}
.tier-s {
  background: linear-gradient(135deg, #2563eb, #3b82f6); /* blue-600 → blue-500 */
  border-color: rgba(59, 130, 246, 0.15);
}
.tier-a {
  background: linear-gradient(135deg, #3b82f6, #60a5fa); /* blue-500 → blue-400 */
  border-color: rgba(96, 165, 250, 0.15);
}
.tier-b {
  background: linear-gradient(135deg, #60a5fa, #93c5fd); /* blue-400 → blue-300 */
  border-color: rgba(147, 197, 253, 0.18);
}
.tier-c {
  background: linear-gradient(135deg, #93c5fd, #bfdbfe); /* blue-300 → blue-200 */
  border-color: rgba(191, 219, 254, 0.25);
}
.tier-d {
  background: linear-gradient(135deg, #bfdbfe, #e5efff); /* blue-200 → very light */
  border-color: rgba(191, 219, 254, 0.35);
}

/* 大学ボックス側は色を薄く（読みやすさ重視） */
.uni-card.tier-ss { background: #eef3ff; }
.uni-card.tier-s  { background: #f0f5ff; }
.uni-card.tier-a  { background: #f3f7ff; }
.uni-card.tier-b  { background: #f6f8ff; }
.uni-card.tier-c  { background: #f8faff; }
.uni-card.tier-d  { background: #fbfcff; }

/* レスポンシブ */
@media (max-width: 640px) {
  .band-label {
    min-width: 48px;
    height: 48px;
    font-size: 12px;
    border-radius: 10px;
  }
  .uni-card {
    min-width: 46%;
    padding: 10px 10px;
  }
}
</style>
