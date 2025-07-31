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

// 表示用ステート
const pair = ref([null, null])
const loading = ref(true)
const invalid = ref(false)
const lastKey = ref(route.params.pairKey || null)
const copied = ref(false)

// 一意キー生成 (順序依存なし)
function getPairKey(a, b) {
  const [x, y] = [a, b].sort()
  return `${PREFIX}${x}_${y}`
}

// パース関数: プレフィックス除去後、IDを分割
function parsePairKey(key) {
  if (!key || !key.startsWith(PREFIX)) return null
  const raw = key.slice(PREFIX.length)
  const segments = raw.split('_')
  // IDが2つの場合のみ処理
  if (segments.length < 2) return null
  // 2つに分割: 前半 / 後半
  const mid = Math.floor(segments.length / 2)
  const id1 = segments.slice(0, mid).join('_')
  const id2 = segments.slice(mid).join('_')
  return [id1, id2]
}

// 初期化: URLパラメータからペアを読み込み
onMounted(() => {
  const key = route.params.pairKey
  const ids = parsePairKey(key)
  if (ids) {
    const [id1, id2] = ids
    const e1 = entries.find(e => e.id === id1)
    const e2 = entries.find(e => e.id === id2)
    if (e1 && e2) {
      pair.value = [e1, e2]
      loading.value = false
      return
    }
  }
  // 無効キー
  invalid.value = true
  loading.value = false
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

// リンクコピー
function copyLink() {
  if (!lastKey.value) return
  navigator.clipboard.writeText(`${window.location.origin}/p/${lastKey.value}`)
  copied.value = true
}
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <h1 class="text-2xl font-bold text-center mb-4">共有された対戦カード</h1>

    <!-- ローディング中 -->
    <div v-if="loading" class="text-center py-8">
      <p>読み込み中...</p>
    </div>

    <!-- 有効なペア表示 -->
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

      <button v-if="IS_DEV" @click="router.push('/')" class="block mx-auto px-3 py-1 bg-yellow-200 rounded text-sm">🔄 戻る</button>
    </div>

    <!-- 無効なキー -->
    <div v-else class="text-center py-8">
      <p class="text-red-500">無効なカードキーです</p>
      <button v-if="IS_DEV" @click="router.push('/')" class="mt-4 px-3 py-1 bg-yellow-200 rounded text-sm">🔄 テスト用戻る</button>
    </div>
  </div>
</template>

<style scoped>
/* カスタマイズ可能 */
</style>
