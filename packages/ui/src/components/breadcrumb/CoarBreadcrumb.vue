<script setup lang="ts">
import { computed } from 'vue';

export type CoarBreadcrumbSize = 'm' | 's';

const props = withDefaults(
  defineProps<{
    /** Separator character between breadcrumb items. */
    separator?: string;
    /** Accessible label for the nav landmark. Localizable. */
    ariaLabel?: string;
    /**
     * Visual density. `'m'` (default, 14 px) is the primary-navigation size.
     * `'s'` (13 px) is for secondary chrome — file-explorer paths, settings
     * trails, anywhere the breadcrumb sits above other content as
     * orientation rather than the main interactive surface. Drives the
     * `--coar-breadcrumb-font-size` token only; spacing + colors stay
     * unchanged so both sizes feel consistent in the same UI.
     */
    size?: CoarBreadcrumbSize;
  }>(),
  { separator: '/', ariaLabel: 'Breadcrumb', size: 'm' },
);

// Wrap in CSS quotes and escape any embedded single quotes.
const separatorCssValue = computed(() => `'${props.separator.replace(/'/g, "\\'")}' `);
</script>

<template>
  <nav
    class="coar-breadcrumb"
    :class="`coar-breadcrumb--${size}`"
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
  font-size: var(--coar-breadcrumb-font-size);
  font-family: var(--coar-body-base-family);
}

/* `s` overrides the font-size token for this instance only (the token
   cascades to children, so links + separators all scale together). `m` is
   the default and uses the token's global value — no override needed. */
.coar-breadcrumb--s {
  --coar-breadcrumb-font-size: var(--coar-component-s-font-size);
}

.coar-breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--coar-breadcrumb-separator-gap);
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
