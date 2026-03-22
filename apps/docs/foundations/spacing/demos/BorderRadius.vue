<template>
  <div class="radius-showcase">
    <div
      v-for="token in radiusTokens"
      :key="token.name"
      class="radius-card"
    >
      <div
        class="radius-shape"
        :style="{ borderRadius: token.value }"
      />
      <div class="radius-meta">
        <span class="radius-name">{{ token.name }}</span>
        <code class="radius-value">{{ token.value }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const radiusTokens = [
  { name: 'XXS', value: '1px' },
  { name: 'XS', value: '2px' },
  { name: 'S', value: '3px' },
  { name: 'M', value: '4px' },
  { name: 'L', value: '5px' },
  { name: 'XL', value: '6px' },
  { name: 'Full', value: '999px' },
];
</script>

<style scoped>
.radius-showcase {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 8px 0;
}

.radius-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.radius-shape {
  width: 72px;
  height: 72px;
  background: var(--vp-c-brand-soft);
  transition: transform 0.2s ease;
}

.radius-shape:hover {
  transform: scale(1.08);
}

.radius-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.radius-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.radius-value {
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  background: none !important;
}
</style>
