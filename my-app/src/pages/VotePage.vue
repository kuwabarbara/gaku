<script setup>
import { ref, onMounted } from 'vue'
import Cookies from 'js-cookie'
import { entries } from '../data/entries'

const IS_DEV = import.meta.env.DEV
const PREFIX = 'voted_'
const pair = ref([null, null])
const lastPair = ref([null, null])
const combos = ref([])
const done = ref(false)
const lastKey = ref(null)
const copied = ref(false)

function getPairKey(a, b) {
  const [x, y] = [a, b].sort()
  return `${PREFIX}${x}_${y}`
}

function allPairs() {
  return entries.flatMap((e1, idx) =>
    entries.slice(idx + 1).map(e2 => [e1.id, e2.id])
  )
}

function loadCombos() {
  combos.value = allPairs().filter(
    ([a, b]) => !Cookies.get(getPairKey(a, b))
  )
}

function nextPair() {
  loadCombos()
  if (!combos.value.length) {
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

onMounted(() => {
  nextPair()
})

async function vote(winner, loser) {
  const key = getPairKey(winner, loser)
  if (Cookies.get(key)) {
    alert('もうこのカードは投票済みです')
    return
  }

  try {
    // Cloud Functions のエンドポイントにPOST送信
    const res = await fetch('https://submitvote-okwtwpzybq-uc.a.run.app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerId: winner, loserId: loser }),
    })

    if (!res.ok) throw new Error(await res.text())

    Cookies.set(key, 'true', { expires: 365 })
    lastPair.value = [...pair.value]
    lastKey.value = key
    copyLink()
    nextPair()
  } catch (err) {
    console.error(err)
    alert('投票に失敗しました')
  }
}

function copyLink() {
  if (!lastKey.value) return
  const url = `${window.location.origin}/p/${lastKey.value}`
  navigator.clipboard.writeText(url)
  copied.value = true
}

function resetVotes() {
  Object.keys(Cookies.get()).forEach(k => {
    if (k.startsWith(PREFIX)) Cookies.remove(k)
  })
  done.value = false
  lastKey.value = null
  lastPair.value = [null, null]
  copied.value = false
  nextPair()
  alert('🔄 テスト用：リセットしました')
}
</script>



<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-center">🎓 GakutteTV</h1>
    <h1 class="text-3xl font-bold text-center mb-6">大学格付けバトル🔥</h1>
    <h1 class="text-3xl font-bold text-center mb-6">両方行けるならどっち行きたい？</h1>

    <!-- 完了メッセージ -->
    <div v-if="done" class="text-center py-8">
      <p class="text-xl">🎉 全カード投票完了！</p>
      <button
        v-if="IS_DEV"
        @click="resetVotes"
        class="mt-4 px-4 py-2 bg-yellow-200 rounded hover:bg-yellow-300"
      >🔄 テスト用リセット</button>
    </div>

    <!-- 投票カード -->
    <div v-else class="flex flex-col sm:flex-row justify-center items-center gap-8 mt-8">
      <div
        v-for="(entry, index) in pair"
        :key="entry?.id"
        class="card bg-blue-100 hover:bg-blue-200 cursor-pointer transition duration-300"
        @click="vote(entry.id, pair[1 - index].id)"
      >
        <div class="text-xl font-bold text-gray-800">{{ entry?.name }}</div>
        <div class="text-sm text-gray-600 mt-2">行きたいほうをタップしてね！</div>
      </div>
    </div>

    <!-- テスト用リセット -->
    <div v-if="IS_DEV" class="mt-6 text-center">
      <button
        @click="resetVotes"
        class="px-4 py-2 bg-yellow-200 rounded hover:bg-yellow-300"
      >🔄 テスト用リセット</button>
    </div>


    <!-- シェアリンク -->
    <div v-if="lastKey" class="mt-8 text-center">
      <p class="mb-2">"{{ lastPair[0]?.name }}" vs "{{ lastPair[1]?.name }}" を匿名でシェア:</p>
      <button
        @click="copyLink"
        class="mt-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >📋 コピー</button>
      <p v-if="copied" class="mt-2 text-green-600">
        ✔ コピーしました！掲示板に貼ってね
      </p>
    </div>
  </div>
</template>

<style scoped>
.card {
  width: 280px;
  height: 160px;
  border-radius: 1rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd5e1; /* slate-300 */
  transition: transform 0.2s ease;
}
.card:hover {
  transform: translateY(-4px);
}
</style>

