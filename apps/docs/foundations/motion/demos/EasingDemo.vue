<template>
  <div class="easing-demo">
    <button class="play-btn" @click="play">
      <svg v-if="!playing" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="6" y1="4" x2="6" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/></svg>
      {{ playing ? 'Playing...' : 'Play all' }}
    </button>

    <div class="easing-tracks">
      <div
        v-for="token in easingTokens"
        :key="token.name"
        class="easing-row"
      >
        <div class="easing-label">
          <span class="easing-name">{{ token.name }}</span>
          <span class="easing-hint">{{ token.hint }}</span>
        </div>
        <div class="easing-track">
          <div
            class="easing-dot"
            :class="{ 'is-animating': playing }"
            :style="{ transitionTimingFunction: token.css }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const easingTokens = [
  { name: 'Linear', css: 'linear', hint: 'Constant speed' },
  { name: 'Ease Out', css: 'cubic-bezier(0.33, 1, 0.68, 1)', hint: 'Fast start, slow end' },
  { name: 'Ease In', css: 'cubic-bezier(0.32, 0, 0.67, 0)', hint: 'Slow start, fast end' },
  { name: 'Ease In-Out', css: 'cubic-bezier(0.65, 0, 0.35, 1)', hint: 'Slow start and end' },
  { name: 'Bounce', css: 'cubic-bezier(0.34, 1.56, 0.64, 1)', hint: 'Elastic overshoot' },
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
.easing-demo {
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

.easing-tracks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.easing-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.easing-label {
  display: flex;
  flex-direction: column;
  min-width: 120px;
  flex-shrink: 0;
}

.easing-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.easing-hint {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.easing-track {
  flex: 1;
  height: 32px;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.easing-dot {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  background: var(--vp-c-brand-1);
  border-radius: 50%;
  transition-property: left;
  transition-duration: 600ms;
}

.easing-dot.is-animating {
  left: calc(100% - 26px);
}
</style>
