<script setup lang="ts">
const props = defineProps<{
  /** Optional explicit label text (alternative to default slot) */
  label?: string;
}>();
</script>

<template>
  <div class="coar-menu-heading">
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
  padding: 0.75rem 0.75rem 0.25rem 0.75rem;
  font-family: var(--coar-font-family-body, Poppins, sans-serif);
  font-size: var(--coar-component-xs-font-size, 11px);
  font-weight: var(--coar-font-weight-semi-bold, 600);
  line-height: var(--coar-line-height-normal);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--coar-text-neutral-secondary, #6b7280);
  cursor: default;
  user-select: none;
}

/* Spacing above headings except first */
.coar-menu-heading:not(:first-child) {
  margin-top: 0.2rem;
}
</style>
