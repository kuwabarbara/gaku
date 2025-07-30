<script setup>
import { ref } from 'vue'
import { db } from './firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { entries } from './data/entries'

const pair = ref(getRandomPair())

function getRandomPair() {
  const shuffled = [...entries].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 2)
}

async function vote(winnerId, loserId) {
  // Firestoreに保存
  try {
    await addDoc(collection(db, 'votes'), {
      winnerId,
      loserId,
      timestamp: serverTimestamp()
    })
    console.log('投票が保存されました')
  } catch (error) {
    console.error('投票の保存に失敗:', error)
  }

  // 次のペアへ
  pair.value = getRandomPair()
}
</script>


<template>
  <h1>大学格付けバトル🔥</h1>
  <div class="vote-pair">
    <button @click="vote(pair[0].id, pair[1].id)">
      {{ pair[0].name }}
    </button>
    <span>vs</span>
    <button @click="vote(pair[1].id, pair[0].id)">
      {{ pair[1].name }}
    </button>
  </div>
</template>

<style scoped>
.vote-pair {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}
button {
  padding: 1rem 2rem;
  font-size: 1.2rem;
}
</style>
