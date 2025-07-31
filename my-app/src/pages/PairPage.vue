<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Cookies from 'js-cookie'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { entries } from '../data/entries'

const route = useRoute()
const router = useRouter()
const IS_DEV = import.meta.env.DEV
const PREFIX = 'voted_'

// 表示状態
const pair = ref([null, null])
const loading = ref(true)
const invalid = ref(false)
const lastKey = ref(route.params.pairKey || null)
const copied = ref(false)

// ペアキーを生成（順序に依存しない一意キー）
function getPairKey(a, b) {
  const [x, y] = [a, b].sort()
  return `${PREFIX}${x}_${y}`
}

// URLパラメータのペアキーを解析してIDを取得
function parsePairKey(key) {
  if (!key || !key.startsWith(PREFIX)) return null
  const raw = key.slice(PREFIX.length)
  const segments = raw.split('_')
  if (segments.length < 2) return null
  const half = Math.floor(segments.length / 2)
  const id1 = segments.slice(0, half).join('_')
  const id2 = segments.slice(half).join('_')
  return [id1, id2]
}

// 初期化ロジック
function loadPair() {
  const key = route.params.pairKey
  const ids = parsePairKey(key)
  if (ids) {
    const [id1, id2] = ids
    const e1 = entries.find(e => e.id === id1)
    const e2 = entries.find(e => e.id === id2)
    if (e1 && e2) {
      pair.value = [e1, e2]
      invalid.value = false
      loading.value = false
      return
    }
  }
  invalid.value = true
  loading.value = false
}

onMounted(() => {
  loadPair()
})

// 投票処理
async function vote(winner, loser) {
  const key = getPairKey(winner, loser)
  if (Cookies.get(key)) {
    alert('この対戦カードには既に投票済みです')
    return
  }
  try {
    await addDoc(collection(db, 'votes'), { winnerId: winner, loserId: loser, timestamp: serverTimestamp() })
    Cookies.set(key, 'true', { expires: 365 })
    alert('投票が保存されました！')
    router.push('/')
  } catch (err) {
    console.error(err)
    alert('投票に失敗しました')
  }
}

// リンクをコピー
function copyLink() {
  if (!lastKey.value) return
  navigator.clipboard.writeText(`${window.location.origin}/p/${lastKey.value}`)
  copied.value = true
}

// 開発用全投票履歴リセット
function resetVotes() {
  Object.keys(Cookies.get()).forEach(k => {
    if (k.startsWith(PREFIX)) Cookies.remove(k)
  })
  alert('🍀 テスト用：投票データをリセットしました')
  window.location.reload()
}
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <h1 class="text-2xl font-bold text-center mb-4">共有された対戦カード</h1>

    <!-- 読み込み中 -->
    <div v-if="loading" class="text-center py-8">
      <p>読み込み中...</p>
    </div>

    <!-- 有効なカード表示 -->
    <div v-else-if="!invalid">
      <div class="flex justify-center items-center gap-4 mb-4">
        <div class="flex-1 p-4 bg-blue-100 rounded text-center">{{ pair[0].name }}</div>
        <span class="text-xl font-bold">VS</span>
        <div class="flex-1 p-4 bg-red-100 rounded text-center">{{ pair[1].name }}</div>
      </div>

      <div class="flex justify-center gap-4 mb-4">
        <button @click="vote(pair[0].id, pair[1].id)" class="px-4 py-2 bg-blue-500 text-white rounded">投票: {{ pair[0].name }}</button>
        <button @click="vote(pair[1].id, pair[0].id)" class="px-4 py-2 bg-red-500 text-white rounded">投票: {{ pair[1].name }}</button>
      </div>

      <div class="text-center mb-4">
        <button @click="copyLink" class="px-4 py-2 bg-gray-200 rounded">📋 リンクをコピー</button>
        <p v-if="copied" class="mt-2 text-green-600">✔ コピーしました！掲示板に貼ってね</p>
      </div>

      <!-- 開発用機能: 戻る & リセット -->
      <div v-if="IS_DEV" class="flex justify-center gap-4 mt-4">
        <button @click="router.push('/')" class="px-3 py-1 bg-yellow-200 rounded text-sm">🔄 戻る</button>
        <button @click="resetVotes" class="px-3 py-1 bg-yellow-200 rounded text-sm">🍀 リセット</button>
      </div>
    </div>

    <!-- 無効なカードキー -->
    <div v-else class="text-center py-8">
      <p class="text-red-500">無効なカードキーです</p>
      <button v-if="IS_DEV" @click="resetVotes" class="mt-4 px-3 py-1 bg-yellow-200 rounded text-sm">🍀 リセット</button>
    </div>
  </div>
</template>

<style scoped>
/* カスタマイズ可 */
</style>
