<!-- src/pages/VotePage.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import Cookies from 'js-cookie'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { entries } from '../data/entries'

const IS_DEV = import.meta.env.DEV
const PREFIX = 'voted_'

const pair    = ref([null, null])
const combos  = ref([])
const done    = ref(false)
const lastKey = ref(null)
const copied  = ref(false)

// ペアキーを一意に作成（順序に依存しない）
function getPairKey(a, b) {
  const [x, y] = [a, b].sort()
  return `${PREFIX}${x}_${y}`
}

// 全組み合わせをリスト化
function allPairs() {
  return entries.flatMap((e1, i) =>
    entries.slice(i + 1).map(e2 => [e1.id, e2.id])
  )
}

// 未投票の組み合わせだけ残す
function loadCombos() {
  combos.value = allPairs().filter(
    ([a, b]) => !Cookies.get(getPairKey(a, b))
  )
}

// 次の対戦カードをランダムにセット
function nextPair() {
  loadCombos()
  if (combos.value.length === 0) {
    done.value = true
    return
  }
  const [a, b] = combos.value[Math.floor(Math.random() * combos.value.length)]
  pair.value = [
    entries.find(e => e.id === a),
    entries.find(e => e.id === b)
  ]
  copied.value = false
}

// 初期ロードで１枚目をセット
onMounted(nextPair)

// 投票ボタンを押したときの処理
async function vote(winner, loser) {
  const key = getPairKey(winner, loser)
  if (Cookies.get(key)) {
    alert('もうこのカードは投票済みです')
    return
  }
  try {
    await addDoc(collection(db, 'votes'), {
      winnerId: winner,
      loserId:  loser,
      timestamp: serverTimestamp()
    })
    Cookies.set(key, 'true', { expires: 365 })
    lastKey.value = key
    nextPair()
  } catch (err) {
    console.error(err)
    alert('投票に失敗しました')
  }
}

// 共有リンクをクリップボードにコピー
function copyLink() {
  if (!lastKey.value) return
  navigator.clipboard.writeText(`${location.origin}/p/${lastKey.value}`)
  copied.value = true
}

// 開発用：全履歴リセット
function resetVotes() {
  Object.keys(Cookies.get()).forEach(k => {
    if (k.startsWith(PREFIX)) Cookies.remove(k)
  })
  done.value = false
  lastKey.value = null
  copied.value = false
  nextPair()
  alert('🔄 テスト用：リセットしました')
}
</script>

<template>
  <div class="p-4 max-w-lg mx-auto">
    <h1 class="text-3xl font-bold text-center mb-6">大学格付けバトル🔥</h1>

    <!-- すべて投票し終わったとき -->
    <div v-if="done" class="text-center py-8">
      <p class="text-xl">🎉 全カード投票完了！</p>
      <button
        v-if="IS_DEV"
        @click="resetVotes"
        class="mt-4 px-4 py-2 bg-yellow-200 rounded"
      >🔄 テスト用リセット</button>
    </div>

    <!-- 投票画面 -->
    <div v-else class="space-y-4">
      <div class="flex gap-4">
        <button
          class="flex-1 px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
          @click="vote(pair[0].id, pair[1].id)"
        >
          {{ pair[0]?.name }}
        </button>
        <span class="self-center font-bold">VS</span>
        <button
          class="flex-1 px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600"
          @click="vote(pair[1].id, pair[0].id)"
        >
          {{ pair[1]?.name }}
        </button>
      </div>

      <button
        v-if="IS_DEV"
        @click="resetVotes"
        class="px-3 py-1 bg-yellow-200 rounded text-sm"
      >🔄 テスト用リセット</button>
    </div>

    <!-- 直前のカードリンクを共有 -->
    <div v-if="lastKey" class="mt-6 text-center">
      <p class="mb-2">このカードを匿名でシェア:</p>
      <button
        @click="copyLink"
        class="mt-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >📋 コピー</button>
      <p v-if="copied" class="mt-2 text-green-600">✔ コピーしました！掲示板に貼ってね</p>
    </div>
  </div>
</template>

<style scoped>
/* 必要に応じて調整 */
</style>
