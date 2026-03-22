<template>
  <div class="spacing-scale">
    <div
      v-for="token in spacingTokens"
      :key="token.name"
      class="spacing-row"
    >
      <div class="spacing-label">
        <span class="spacing-name">{{ token.name }}</span>
        <code class="spacing-value">{{ token.value }}</code>
      </div>
      <div class="spacing-track">
        <div
          class="spacing-bar"
          :style="{ width: token.value }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const spacingTokens = [
  { name: 'XXS', value: '2px' },
  { name: 'XS', value: '4px' },
  { name: 'S', value: '8px' },
  { name: 'M', value: '16px' },
  { name: 'L', value: '24px' },
  { name: 'XL', value: '32px' },
  { name: 'XXL', value: '48px' },
  { name: 'XXXL', value: '64px' },
];
</script>

<style scoped>
.spacing-scale {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}

.spacing-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.spacing-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 100px;
  flex-shrink: 0;
}

.spacing-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  min-width: 36px;
}

.spacing-value {
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  background: none !important;
}

.spacing-track {
  flex: 1;
  height: 24px;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 4px;
  overflow: hidden;
}

.spacing-bar {
  height: 14px;
  min-width: 2px;
  background: var(--vp-c-brand-1);
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
