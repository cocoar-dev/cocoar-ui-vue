<script setup lang="ts">
import { CoarTextInput, CoarIcon } from '@cocoar/vue-ui';
import type { CoarTextInputSize } from '@cocoar/vue-ui';

withDefaults(
  defineProps<{
    /** Placeholder text for the search input */
    placeholder?: string;
    /** Input size variant */
    size?: CoarTextInputSize;
  }>(),
  {
    placeholder: 'Search...',
    size: 'm',
  },
);

const searchText = defineModel<string>({ default: '' });
</script>

<template>
  <div class="coar-data-grid-search">
    <CoarTextInput
      v-model="searchText"
      :placeholder="placeholder"
      :size="size"
      clearable
      class="coar-data-grid-search__input"
    >
      <template #prefix>
        <CoarIcon name="search" source="coar-builtin" size="s" />
      </template>
    </CoarTextInput>
    <div v-if="$slots.default" class="coar-data-grid-search__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.coar-data-grid-search {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s, 8px);
}

.coar-data-grid-search__input {
  flex: 1;
  min-width: 0;
}

.coar-data-grid-search__actions {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs, 4px);
  flex-shrink: 0;
}
</style>
