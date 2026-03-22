<template>
  <div class="shadow-showcase">
    <div class="shadow-surface">
      <div
        v-for="token in shadowTokens"
        :key="token.name"
        class="shadow-card-wrap"
      >
        <div
          class="shadow-card"
          :style="{ boxShadow: `var(${token.variable})` }"
        />
        <div class="shadow-meta">
          <span class="shadow-name">{{ token.name }}</span>
          <span class="shadow-desc">{{ token.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const shadowTokens = [
  { name: 'XS', variable: '--coar-shadow-xs', description: 'Hover states' },
  { name: 'S', variable: '--coar-shadow-s', description: 'Cards' },
  { name: 'M', variable: '--coar-shadow-m', description: 'Dropdowns' },
  { name: 'L', variable: '--coar-shadow-l', description: 'Modals' },
  { name: 'XL', variable: '--coar-shadow-xl', description: 'Overlays' },
  { name: 'Focus', variable: '--coar-shadow-focus', description: 'Focus ring' },
];
</script>

<style scoped>
.shadow-showcase {
  padding: 8px 0;
}

.shadow-surface {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 32px;
  padding: 32px 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.shadow-card-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.shadow-card {
  width: 88px;
  height: 88px;
  background: var(--vp-c-bg);
  border-radius: 10px;
  transition: transform 0.25s ease;
}

.shadow-card:hover {
  transform: translateY(-2px);
}

.shadow-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.shadow-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.shadow-desc {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
</style>
