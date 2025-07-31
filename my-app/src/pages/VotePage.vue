<script setup>
import { ref, onMounted } from 'vue'
import Cookies from 'js-cookie'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { entries } from '../data/entries'

const IS_DEV = import.meta.env.DEV
const PREFIX = 'voted_'

// Reactive state
const pair      = ref([null, null])       // current displayed pair
const lastPair  = ref([null, null])       // last voted pair for sharing
const combos    = ref([])
const done      = ref(false)
const lastKey   = ref(null)
const copied    = ref(false)

// Generate a unique key for a pair (order-independent)
function getPairKey(a, b) {
  const [x, y] = [a, b].sort()
  return `${PREFIX}${x}_${y}`
}

// List all possible combinations
function allPairs() {
  return entries.flatMap((e1, idx) =>
    entries.slice(idx + 1).map(e2 => [e1.id, e2.id])
  )
}

// Filter out already voted pairs
function loadCombos() {
  combos.value = allPairs().filter(
    ([a, b]) => !Cookies.get(getPairKey(a, b))
  )
}

// Display next random pair
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

// Initialize first pair on mount
onMounted(() => {
  nextPair()
})

// Voting handler: save vote, set share data, copy link, then advance
async function vote(winner, loser) {
  const key = getPairKey(winner, loser)
  if (Cookies.get(key)) {
    alert('もうこのカードは投票済みです')
    return
  }
  try {
    // Save vote
    await addDoc(collection(db, 'votes'), {
      winnerId: winner,
      loserId:  loser,
      timestamp: serverTimestamp()
    })
    // Mark as voted
    Cookies.set(key, 'true', { expires: 365 })
    // Store last pair and key for sharing
    lastPair.value = [...pair.value]
    lastKey.value  = key
    // Copy link immediately
    copyLink()
    // Advance to next pair
    nextPair()
  } catch (err) {
    console.error(err)
    alert('投票に失敗しました')
  }
}

// Copy share link for lastPair
function copyLink() {
  if (!lastKey.value) return
  const url = `${window.location.origin}/p/${lastKey.value}`
  navigator.clipboard.writeText(url)
  copied.value = true
}

// Development reset
function resetVotes() {
  Object.keys(Cookies.get()).forEach(k => {
    if (k.startsWith(PREFIX)) Cookies.remove(k)
  })
  done.value  = false
  lastKey.value = null
  lastPair.value = [null, null]
  copied.value = false
  nextPair()
  alert('🔄 テスト用：リセットしました')
}
</script>

<template>
  <div class="p-4 max-w-lg mx-auto">
    <h1 class="text-3xl font-bold text-center mb-6">大学格付けバトル🔥</h1>

    <!-- Completed all pairs -->
    <div v-if="done" class="text-center py-8">
      <p class="text-xl">🎉 全カード投票完了！</p>
      <button
        v-if="IS_DEV"
        @click="resetVotes"
        class="mt-4 px-4 py-2 bg-yellow-200 rounded"
      >🔄 テスト用リセット</button>
    </div>

    <!-- Voting UI -->
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

    <!-- Share link for last voted pair -->
    <div v-if="lastKey" class="mt-6 text-center">
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
/* Custom styles if needed */
</style>
