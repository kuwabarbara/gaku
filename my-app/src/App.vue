<!-- src/App.vue -->
<template>
  <nav class="p-4 bg-gray-100 flex space-x-4">
    <router-link to="/"        class="text-blue-600 hover:underline">投票ページ</router-link>
</nav>

  <nav class="p-4 bg-gray-100 flex space-x-4">
    <router-link to="/ranking" class="text-blue-600 hover:underline">ランキング</router-link>
</nav>
 

  <main class="p-4">
    <router-view />
  </main>
</template>
