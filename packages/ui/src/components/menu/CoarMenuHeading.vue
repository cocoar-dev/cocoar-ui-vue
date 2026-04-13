<script setup lang="ts">
const props = defineProps<{
  /** Optional explicit label text (alternative to default slot) */
  label?: string;
  /** Stick to top of scroll container */
  sticky?: boolean;
}>();
</script>

<template>
  <div class="coar-menu-heading" :class="{ 'coar-menu-heading--sticky': props.sticky }" role="heading" aria-level="3">
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
  background: var(--coar-background-neutral-primary);
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

.coar-menu-heading--sticky {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--coar-background-neutral-primary);
}
</style>
