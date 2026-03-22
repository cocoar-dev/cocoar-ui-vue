<template>
  <div class="duration-demo">
    <button class="play-btn" @click="play">
      <svg v-if="!playing" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="6" y1="4" x2="6" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/></svg>
      {{ playing ? 'Playing...' : 'Play all' }}
    </button>

    <div class="duration-tracks">
      <div
        v-for="token in durationTokens"
        :key="token.name"
        class="duration-row"
      >
        <div class="duration-label">
          <span class="duration-name">{{ token.name }}</span>
          <code class="duration-value">{{ token.value }}</code>
        </div>
        <div class="duration-track">
          <div
            class="duration-dot"
            :class="{ 'is-animating': playing }"
            :style="{ transitionDuration: token.value }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const durationTokens = [
  { name: 'Instant', value: '0ms' },
  { name: 'Fast', value: '100ms' },
  { name: 'Normal', value: '200ms' },
  { name: 'Slow', value: '300ms' },
  { name: 'Slower', value: '400ms' },
  { name: 'Slowest', value: '600ms' },
];

const playing = ref(false);
let timeout: ReturnType<typeof setTimeout> | null = null;

function play() {
  if (playing.value) {
    playing.value = false;
    if (timeout) clearTimeout(timeout);
    return;
  }
  playing.value = true;
  timeout = setTimeout(() => {
    playing.value = false;
  }, 1200);
}
</script>

<style scoped>
.duration-demo {
  padding: 4px 0;
}

.play-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
  margin-bottom: 20px;
}

.play-btn:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
}

.play-btn:active {
  transform: scale(0.97);
}

.duration-tracks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.duration-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 120px;
  flex-shrink: 0;
}

.duration-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  min-width: 56px;
}

.duration-value {
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  background: none !important;
}

.duration-track {
  flex: 1;
  height: 28px;
  background: var(--vp-c-bg-soft);
  border-radius: 14px;
  position: relative;
  overflow: hidden;
}

.duration-dot {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  background: var(--vp-c-brand-1);
  border-radius: 50%;
  transition-property: left;
  transition-timing-function: ease-out;
}

.duration-dot.is-animating {
  left: calc(100% - 24px);
}
</style>
