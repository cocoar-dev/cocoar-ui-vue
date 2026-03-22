<template>
  <div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
      <span style="font-size: 14px;">Processing...</span>
      <span style="font-size: 14px;">{{ animatedProgress }}%</span>
    </div>
    <CoarProgressBar :value="animatedProgress" variant="info" size="l" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { CoarProgressBar } from '@cocoar/vue-ui';

const animatedProgress = ref(0);
let interval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  interval = setInterval(() => {
    animatedProgress.value = (animatedProgress.value + 1) % 101;
  }, 50);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>
