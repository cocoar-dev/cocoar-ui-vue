<!-- Generated from apps/docs/foundations/motion.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Motion

Timing, easing, and pre-composed transitions that make the UI feel responsive and alive.

## Duration

How long an animation takes. Short durations suit small changes; longer ones give complex movements room to breathe. Press **Play** to see each duration side by side.

**Demo — `motion/demos/DurationDemo.vue`**

```vue
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
```

## Easing

How animations accelerate and decelerate. Press **Play** to compare every curve at the same duration.

**Demo — `motion/demos/EasingDemo.vue`**

```vue
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
```

## Pre-composed Transitions

Ready-made `transition` values that pair a duration with an easing curve. Hover each button to see the effect it controls.

**Demo — `motion/demos/TransitionDemo.vue`**

```vue
<template>
  <div class="transition-demo">
    <div class="transition-grid">
      <div
        v-for="token in transitionTokens"
        :key="token.name"
        class="transition-card"
      >
        <button
          class="transition-btn"
          :class="token.className"
          :style="{ transition: `var(${token.variable})` }"
        >
          Hover me
        </button>
        <div class="transition-meta">
          <span class="transition-name">{{ token.name }}</span>
          <span class="transition-desc">{{ token.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const transitionTokens = [
  {
    name: 'Default',
    variable: '--coar-transition-default',
    description: 'General purpose',
    className: 'effect-default',
  },
  {
    name: 'Fast',
    variable: '--coar-transition-fast',
    description: 'Micro-interactions',
    className: 'effect-fast',
  },
  {
    name: 'Colors',
    variable: '--coar-transition-colors',
    description: 'Color changes',
    className: 'effect-colors',
  },
  {
    name: 'Transform',
    variable: '--coar-transition-transform',
    description: 'Scale & translate',
    className: 'effect-transform',
  },
  {
    name: 'Opacity',
    variable: '--coar-transition-opacity',
    description: 'Show / hide',
    className: 'effect-opacity',
  },
  {
    name: 'Shadow',
    variable: '--coar-transition-shadow',
    description: 'Elevation shifts',
    className: 'effect-shadow',
  },
];
</script>

<style scoped>
.transition-demo {
  padding: 4px 0;
}

.transition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 24px;
}

.transition-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.transition-btn {
  width: 100%;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

/* Each button demonstrates its specific transition property */
.transition-btn.effect-default:hover,
.transition-btn.effect-fast:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
  transform: scale(1.03);
  box-shadow: 0 4px 16px rgba(17, 131, 205, 0.2);
}

.transition-btn.effect-colors:hover {
  background: #16a34a;
  color: #fff;
}

.transition-btn.effect-transform:hover {
  transform: scale(1.06) translateY(-2px);
}

.transition-btn.effect-opacity:hover {
  opacity: 0.5;
}

.transition-btn.effect-shadow:hover {
  box-shadow: 0 8px 24px rgba(17, 131, 205, 0.25);
}

.transition-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.transition-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.transition-desc {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
</style>
```

## Usage

### Basic transition

```css
.my-element {
  transition: var(--coar-transition-default);
}
```

### Custom transition with tokens

```css
.my-element {
  transition:
    background-color var(--coar-duration-normal) var(--coar-ease-out),
    transform var(--coar-duration-fast) var(--coar-ease-bounce);
}
```

### Animation with duration

```css
@keyframes slide-in {
  from { transform: translateY(-8px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.my-element {
  animation: slide-in var(--coar-duration-normal) var(--coar-ease-out);
}
```

## Accessibility

All motion tokens respect the `prefers-reduced-motion` media query. When a user opts for reduced motion, every duration collapses to `0 ms` — transitions become instant and nothing moves unexpectedly.

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --coar-duration-fast:    0ms;
    --coar-duration-normal:  0ms;
    --coar-duration-slow:    0ms;
    --coar-duration-slower:  0ms;
    --coar-duration-slowest: 0ms;
  }
}
```

> **Info**
>
> Always use COAR duration tokens instead of hardcoded values. This ensures animations are automatically disabled for users who prefer reduced motion.

## Token Reference

### Duration

| Token | Value | Usage |
|-------|-------|-------|
| `--coar-duration-instant` | 0 ms | No animation (immediate) |
| `--coar-duration-fast` | 100 ms | Micro-interactions, hover states |
| `--coar-duration-normal` | 200 ms | Most transitions |
| `--coar-duration-slow` | 300 ms | Complex state changes |
| `--coar-duration-slower` | 400 ms | Large movements |
| `--coar-duration-slowest` | 600 ms | Page-level transitions |

### Easing

| Token | Usage |
|-------|-------|
| `--coar-ease-linear` | Constant speed — for opacity, color |
| `--coar-ease-out` | Fast start, slow end — most UI motion |
| `--coar-ease-in` | Slow start, fast end — dismissals |
| `--coar-ease-in-out` | Slow start and end — complex motions |
| `--coar-ease-bounce` | Elastic overshoot — playful feedback |

### Pre-composed Transitions

| Token | Usage |
|-------|-------|
| `--coar-transition-default` | General-purpose transition |
| `--coar-transition-fast` | Quick micro-interactions |
| `--coar-transition-colors` | Background and text color changes |
| `--coar-transition-transform` | Scale, rotate, translate |
| `--coar-transition-opacity` | Show / hide transitions |
| `--coar-transition-shadow` | Elevation changes on hover |
