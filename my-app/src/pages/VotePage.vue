<script setup>
import { ref } from 'vue'
import Cookies from 'js-cookie'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { entries } from '../data/entries'

// 開発環境フラグ
const IS_DEV = import.meta.env.DEV

// クッキーキーのプレフィックス
const PREFIX = 'voted_'

// ペアごとに一意なキーを作成
function getPairKey(id1, id2) {
  const [a, b] = [id1, id2].sort()
  return `${PREFIX}${a}_${b}`
}

// 全組み合わせを生成
function generateAllPairs() {
  const combos = []
  entries.forEach((e1, i) => {
    entries.slice(i + 1).forEach(e2 => {
      combos.push([e1.id, e2.id])
    })
  })
  return combos
}

// 使用可能なペア群
const combos = ref([])
// 現在表示中のペア
const pair = ref([null, null])
// 全て表示済みフラグ
const done = ref(false)

// クッキーで投票済みのペアを除外し combos を更新
function loadCombos() {
  const all = generateAllPairs()
  combos.value = all.filter(([id1, id2]) => !Cookies.get(getPairKey(id1, id2)))
}

// 次のペアをセット
function nextPair() {
  loadCombos()
  if (combos.value.length === 0) {
    done.value = true
    return
  }
  const idx = Math.floor(Math.random() * combos.value.length)
  const [id1, id2] = combos.value[idx]
  pair.value = [
    entries.find(e => e.id === id1),
    entries.find(e => e.id === id2)
  ]
}

// 初期化
nextPair()

// 投票処理
async function vote(winnerId, loserId) {
  const key = getPairKey(winnerId, loserId)
  if (Cookies.get(key)) {
    alert('この対戦カードには既に投票済みです')
    return
  }
  try {
    // Firestore に保存
    await addDoc(collection(db, 'votes'), {
      winnerId,
      loserId,
      timestamp: serverTimestamp()
    })
    // クッキーにフラグをセット
    Cookies.set(key, 'true', { expires: 365 })
    // 次のペア
    nextPair()
  } catch (e) {
    console.error(e)
    alert('投票に失敗しました')
  }
}

// 開発用リセット
function resetVotes() {
  Object.keys(Cookies.get()).forEach(key => {
    if (key.startsWith(PREFIX)) Cookies.remove(key)
  })
  done.value = false
  nextPair()
  alert('🍀 テスト用：投票データをリセットしました')
}
</script>

<template>
  <div class="p-4 max-w-lg mx-auto">
    <h1 class="text-3xl font-bold text-center mb-6">大学格付けバトル🔥</h1>

    <!-- すべて表示済み -->
    <div v-if="done" class="text-center py-10">
      <p class="text-xl">🎉 全ての組み合わせを表示し終わりました！</p>
      <button
        v-if="IS_DEV"
        @click="resetVotes"
        class="mt-4 px-4 py-2 bg-yellow-200 rounded"
      >
        🍀 テスト用：リセット
      </button>
    </div>

    <!-- 投票UI -->
    <div v-else>
      <div class="flex justify-center items-center gap-4 mb-6">
        <button
          @click="vote(pair[0].id, pair[1].id)"
          class="flex-1 px-4 py-3 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition"
        >
          {{ pair[0].name }}
        </button>

        <span class="text-xl font-bold">VS</span>

        <button
          @click="vote(pair[1].id, pair[0].id)"
          class="flex-1 px-4 py-3 bg-red-500 text-white rounded shadow hover:bg-red-600 transition"
        >
          {{ pair[1].name }}
        </button>
      </div>

      <!-- 開発環境のみリセットボタン -->
      <button
        v-if="IS_DEV"
        @click="resetVotes"
        class="px-3 py-1 bg-yellow-200 rounded text-sm"
      >
        🍀 テスト用：投票リセット
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 必要に応じて調整 */
</style>
