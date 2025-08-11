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

// 段（バンド）分割
const BAND_SIZES = [5, 10, 15, 20, 30]
const BAND_LABELS = ['SS', 'S', 'A', 'B', 'C', 'D']
const BAND_CLASSES = ['tier-ss','tier-s','tier-a','tier-b','tier-c','tier-d']

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
  if (start < list.length) out.push(list.slice(start))
  return out
})
</script>

<template>
  <div class="wrap">
    <h1 class="ttl">🎓 GakutteTV</h1>
    <h2 class="subttl">学歴ランキング（段表示）</h2>

    <p v-if="loading" class="loading">読み込み中…</p>

    <div v-else>
      <p class="meta">
        表示元：{{ fromCache ? 'サーバーキャッシュ' : 'クライアント計算' }}
        <span v-if="updatedAt">（最終更新: {{ updatedAt.toLocaleString() }}）</span>
      </p>

      <div class="band-list">
        <div v-for="(row, idx) in bands" :key="idx" class="band-row">
          <!-- ラベル（PCは左、モバイルは上に配置） -->
          <div class="band-label" :class="BAND_CLASSES[idx] || BAND_CLASSES.at(-1)">
            {{ BAND_LABELS[idx] || BAND_LABELS.at(-1) }}
          </div>

          <!-- 大学カード：スマホは2列→幅が広がると自動で3列以上 -->
          <div class="band-items">
            <div
              v-for="item in row"
              :key="item.id"
              class="uni-card"
              :class="BAND_CLASSES[idx] || BAND_CLASSES.at(-1)"
              :title="`${item.name} / ${item.rating}pt`"
            >
              <div class="uni-name">{{ item.name }}</div>
              <div class="uni-score">{{ item.rating }}pt</div>
            </div>
          </div>
        </div>
      </div>

      <p class="note">※ 表示は投票結果に基づく独自指標（Elo）です。エンタメとしてお楽しみください。</p>
    </div>
  </div>
</template>

<style scoped>
/* ====== Layout base ====== */
.wrap {
  max-width: 1040px;
  margin: 0 auto;
  padding: 24px;
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
.loading { text-align: center; color: #6b7280; padding: 40px 0; }
.meta { text-align: center; color: #6b7280; font-size: 12px; margin-bottom: 16px; }
.note { text-align: center; color: #6b7280; font-size: 12px; margin-top: 24px; }

/* ====== Band rows ====== */
/* PC: ラベル左 + アイテム右（横並び）
   SP: ラベル上 + アイテム下（縦積み） */
.band-list { display: grid; gap: 18px; }
.band-row {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 12px;
  padding: 8px 0;
}

/* バンドラベル（SS / S / A / …） */
.band-label {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 6px 14px rgba(0,0,0,0.08);
  user-select: none;
  position: sticky; /* PCで段が長い時に視線を失わない小ワザ */
  top: 12px;
}

/* 大学カード群：スマホは2列、横幅に応じて自動で列数アップ */
.band-items {
  display: grid;
  gap: 10px;
  /* 最小幅 150px、最大は空きに応じて拡張。スマホではまず 2 列になる */
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

/* 大学カード */
.uni-card {
  display: grid;
  align-items: center;
  justify-items: center;
  grid-template-rows: auto auto;
  padding: 10px 12px;
  min-height: 64px;
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
.uni-name { font-weight: 600; font-size: 14px; color: #1f2937; line-height: 1.2; }
.uni-score { font-size: 12px; color: #2563eb; margin-top: 4px; }

/* ====== Color tiers ====== */
.tier-ss { background: linear-gradient(135deg, #1f4ed8, #2563eb); }
.tier-s  { background: linear-gradient(135deg, #2563eb, #3b82f6); }
.tier-a  { background: linear-gradient(135deg, #3b82f6, #60a5fa); }
.tier-b  { background: linear-gradient(135deg, #60a5fa, #93c5fd); }
.tier-c  { background: linear-gradient(135deg, #93c5fd, #bfdbfe); }
.tier-d  { background: linear-gradient(135deg, #bfdbfe, #e5efff); }

/* カード側は薄色で読みやすく */
.uni-card.tier-ss { background: #eef3ff; }
.uni-card.tier-s  { background: #f0f5ff; }
.uni-card.tier-a  { background: #f3f7ff; }
.uni-card.tier-b  { background: #f6f8ff; }
.uni-card.tier-c  { background: #f8faff; }
.uni-card.tier-d  { background: #fbfcff; }

/* ====== Responsive tweaks ====== */
/* 極小画面：カードは 1 列、ラベルは上に（縦積み） */
@media (max-width: 380px) {
  .band-row {
    grid-template-columns: 1fr; /* ラベル上、カード下 */
  }
  .band-label {
    position: static;
    width: 52px; height: 52px; font-size: 12px; margin: 0 auto 8px;
  }
  .band-items {
    grid-template-columns: 1fr; /* 1列 */
  }
  .uni-name { font-size: 13px; }
}

/* 小さめスマホ：カード2列、ラベルは上（縦積み） */
@media (min-width: 381px) and (max-width: 640px) {
  .band-row { grid-template-columns: 1fr; }
  .band-label {
    position: static;
    width: 56px; height: 56px; font-size: 12px; margin: 0 auto 8px;
  }
  .band-items {
    grid-template-columns: repeat(2, minmax(0, 1fr)); /* 2列固定 */
  }
}

/* タブレット：カードは 3〜4 列に広がる。ラベルは左に戻す */
@media (min-width: 641px) and (max-width: 900px) {
  .band-row { grid-template-columns: auto 1fr; }
  .band-items { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
}

/* 広め（PC）：カードサイズを少し大きく */
@media (min-width: 901px) {
  .band-items { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
}
</style>
