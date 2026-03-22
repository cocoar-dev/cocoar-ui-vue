<template>
  <div class="type-scale">
    <div v-for="item in typeScale" :key="item.label" class="type-row">
      <div class="type-meta">
        <span class="type-label">{{ item.label }}</span>
        <span class="type-spec">{{ item.spec }}</span>
      </div>
      <div class="type-sample-wrap">
        <p :class="item.class" class="type-sample">{{ item.text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const typeScale = [
  { label: 'Display', class: 'coar-display', text: 'Display', spec: 'Inter / 72px / Bold' },
  { label: 'Title', class: 'coar-title', text: 'Title', spec: 'Inter / 48px / Bold' },
  { label: 'Subtitle', class: 'coar-subtitle', text: 'Subtitle', spec: 'Inter / 32px / Regular' },
  { label: 'Heading', class: 'coar-heading', text: 'Heading', spec: 'Poppins / 24px / SemiBold' },
  { label: 'Subheading', class: 'coar-subheading', text: 'Subheading', spec: 'Poppins / 20px / Regular' },
  { label: 'Body', class: 'coar-body', text: 'The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 16px / Regular' },
  { label: 'Body Bold', class: 'coar-body-bold', text: 'The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 16px / Bold' },
  { label: 'Body Small', class: 'coar-body-small', text: 'The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 14px / Regular' },
  { label: 'Body Small Bold', class: 'coar-body-small-bold', text: 'The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 14px / Bold' },
  { label: 'Caption', class: 'coar-caption', text: 'Caption Text', spec: 'Poppins / 12px / Medium / Uppercase' },
  { label: 'Footnote', class: 'coar-footnote', text: 'Footnote — Small print and legal copy.', spec: 'Poppins / 10px / Regular' },
];
</script>

<style scoped>
.type-scale {
  display: flex;
  flex-direction: column;
}

.type-row {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 20px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.type-row:last-child {
  border-bottom: none;
}

.type-meta {
  flex: 0 0 180px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.type-spec {
  font-size: 12px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

.type-sample-wrap {
  flex: 1;
  min-width: 0;
}

.type-sample {
  margin: 0;
  color: var(--vp-c-text-1);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .type-row {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .type-meta {
    flex: none;
  }
}
</style>
