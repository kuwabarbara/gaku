<!-- src/pages/RankingPage.vue -->
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

// Elo（フォールバック用）
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
    // 1) キャッシュ（/cache/ranking）を優先
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

    // 2) フォールバックでクライアント計算（Elo）
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

/**
 * 表示ロジック：
 *  - FC2風の「S / A+ / A / B+ / ...」行ラベル＋横並び大学名。
 *  - 本実装では「人数割り（上位5名→S、次10名→A+ …）」でバンド分け。
 *    必要なら閾値や手動リストに差し替え可能。
 */
const BAND_LABELS = ['S','A+','A','B+','B','C+','C','D+','D','E+','E','F']
const BAND_SIZES  = [1, 2, 3, 5, 10, 16, 18, 30, 40, 50, 60] // 例：上位が少数精鋭、下にいくほど人数が増える
// ↑合計がエントリ数を超えてもOK。切れたら最後の「F」に残りが全部入る。

const bands = computed(() => {
  const list = rankings.value
  const rows = []
  let idx = 0
  for (let i = 0; i < BAND_LABELS.length; i++) {
    const size = BAND_SIZES[i] ?? 9999
    if (idx >= list.length) break
    rows.push({
      label: BAND_LABELS[i],
      items: list.slice(idx, Math.min(idx + size, list.length))
    })
    idx += size
  }
  if (idx < list.length) {
    rows.push({ label: 'F', items: list.slice(idx) })
  }
  return rows
})
</script>

<template>
  <div class="wrap">
    <h1 class="ttl">🎓 GakutteTV</h1>
    <h2 class="subttl">学歴ランキング</h2>

    <p v-if="loading" class="loading">読み込み中…</p>

    <div v-else>
      <p class="meta">
        表示元：{{ fromCache ? 'サーバーキャッシュ' : 'クライアント計算' }}
        <span v-if="updatedAt">（最終更新: {{ updatedAt.toLocaleString() }}）</span>
      </p>

      <!-- FC2風：行ごとに ラベル + 横並び大学名（折り返し可） -->
      <div class="tier-table">
        <div v-for="row in bands" :key="row.label" class="tier-row">
          <div class="tier-label">{{ row.label }}</div>
          <div class="tier-items">
            <!-- 大学名をインラインで横並び。スマホでは自然に折り返す -->
            <span
              v-for="(u, i) in row.items"
              :key="u.id"
              class="uni-item"
              :title="`${u.name} / ${u.rating}pt`"
            >
              {{ u.name }}<span v-if="i !== row.items.length - 1" class="sep">　</span>
            </span>
          </div>
        </div>
      </div>

      <p class="note">※ 表示は投票結果に基づく独自指標（Elo）です。エンタメとしてお楽しみください。</p>
    </div>
  </div>
</template>
<style scoped>
/* ===== Theme variables (Light default) ===== */
:root {
  --bg: #ffffff;
  --fg: #111827;
  --muted: #6b7280;
  --tier-label: #111827;
  --tier-item: #111827;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b0f19;
    --fg: #ffffff;
    --muted: #cbd5e1;
    --tier-label: #ffffff;
    --tier-item: #ffffff;
  }
}

/* ====== Layout base ====== */
.wrap {
  max-width: 1040px;
  margin: 0 auto;
  padding: 24px;
  background: var(--bg);
  color: var(--fg);
}
.ttl {
  text-align: center;
  font-weight: 800;
  font-size: 28px;
  margin: 0 0 6px;
}
.subttl {
  text-align: center;
  font-weight: 800;
  font-size: 22px;
  margin: 0 0 20px;
}
.meta {
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 16px;
}
.note {
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  margin-top: 24px;
}

/* ====== FC2風レイアウト ====== */
.tier {
  margin: 10px 0 18px;
}
.tier-header {
  display: grid;
  grid-template-columns: 64px 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}
.tier-label {
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  padding-top: 4px;
  text-align: center;
  color: var(--tier-label);
  user-select: none;
}
.tier-items {
  font-size: 12px;
  color: var(--tier-item);
  line-height: 1.7;
  letter-spacing: 0.2px;
  word-break: keep-all;
  overflow-wrap: anywhere;
}
.uni-item {
  display: inline;
  white-space: nowrap;
}
.dot {
  margin: 0 0.25em;
  color: var(--tier-item);
}

/* Responsive tweaks */
@media (max-width: 420px) {
  .tier-header { grid-template-columns: 52px 1fr; }
}
</style>