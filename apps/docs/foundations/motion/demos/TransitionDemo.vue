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
