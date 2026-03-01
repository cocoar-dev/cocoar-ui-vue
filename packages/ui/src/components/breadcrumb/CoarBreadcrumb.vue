<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Separator character between breadcrumb items. */
    separator?: string;
    /** Accessible label for the nav landmark. Localizable. */
    ariaLabel?: string;
  }>(),
  { separator: '/', ariaLabel: 'Breadcrumb' },
);

// Wrap in CSS quotes and escape any embedded single quotes.
const separatorCssValue = computed(() => `'${props.separator.replace(/'/g, "\\'")}' `);
</script>

<template>
  <nav
    class="coar-breadcrumb"
    :aria-label="ariaLabel"
    :style="{ '--coar-breadcrumb-separator': separatorCssValue }"
  >
    <ol class="coar-breadcrumb-list">
      <slot />
    </ol>
  </nav>
</template>

<style scoped>
.coar-breadcrumb {
  display: block;
  font-size: var(--coar-breadcrumb-font-size, var(--coar-font-size-s, 14px));
  font-family: var(--coar-body-base-family, Poppins, sans-serif);
}

.coar-breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--coar-breadcrumb-separator-gap, var(--coar-spacing-xs, 4px));
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
