<script setup lang="ts">
const props = defineProps<{
  /** Optional explicit label text (alternative to default slot) */
  label?: string;
}>();
</script>

<template>
  <div class="coar-menu-heading" role="heading" aria-level="3">
    <template v-if="props.label">{{ props.label }}</template>
    <slot v-else />
  </div>
</template>

<style scoped>
.coar-menu-heading {
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  padding: var(--coar-menu-heading-padding);
  font-family: var(--coar-menu-heading-font-family);
  font-size: var(--coar-menu-heading-font-size);
  font-weight: var(--coar-menu-heading-font-weight);
  line-height: var(--coar-menu-heading-line-height);
  text-transform: var(--coar-menu-heading-text-transform);
  letter-spacing: var(--coar-menu-heading-letter-spacing);
  color: var(--coar-menu-heading-color);
  cursor: default;
  user-select: none;
}

/* Spacing above headings except first */
.coar-menu-heading:not(:first-child) {
  margin-top: 0.2rem;
}
</style>
