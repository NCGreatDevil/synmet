<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const message = ref('Hello Vue 3 + TypeScript + Vite')

function increment() {
  count.value++
}
</script>

<template>
  <div class="container">
    <h1>{{ message }}</h1>
    <div class="counter">
      <p>Count: {{ count }}</p>
      <button @click="increment">Increment</button>
    </div>
    <div class="test-link">
      <router-link to="/square" class="link-btn">进入社交关系图谱</router-link>
      <router-link to="/test-mob" class="link-btn">进入移动端社交图谱</router-link>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}

h1 {
  font-size: 2rem;
  color: #213547;
}

.counter {
  margin-top: 2rem;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  border: 1px solid #213547;
  border-radius: 4px;
  background-color: #f9f9f9;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #e0e0e0;
}

.test-link {
  margin-top: 2rem;
}

.link-btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  color: #fff;
  background-color: #1677ff;
  border-radius: 8px;
  text-decoration: none;
  transition: background-color 0.2s;
}

.link-btn:hover {
  background-color: #4096ff;
}
</style>
