<script setup lang="ts">
import { CoarTextInput, CoarIcon } from '@cocoar/vue-ui';
import type { CoarTextInputSize } from '@cocoar/vue-ui';

const props = withDefaults(
  defineProps<{
    /** Placeholder text for the search input */
    placeholder?: string;
    /** Input size variant */
    size?: CoarTextInputSize;
    /** Show a border around the search bar */
    bordered?: boolean;
    /** Add elevation shadow */
    elevated?: boolean;
  }>(),
  {
    placeholder: 'Search...',
    size: 'm',
    bordered: false,
    elevated: false,
  },
);

const searchText = defineModel<string>({ default: '' });
</script>

<template>
  <div
    class="coar-data-grid-search"
    :class="{ 'coar-data-grid-search--bordered': props.bordered, 'coar-data-grid-search--elevated': props.elevated }"
  >
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
  gap: var(--coar-spacing-s);
}

.coar-data-grid-search--bordered {
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  padding: var(--coar-spacing-s);
}

.coar-data-grid-search--elevated {
  box-shadow: var(--coar-elevation-medium);
  border-radius: var(--coar-radius-s);
  padding: var(--coar-spacing-s);
}

.coar-data-grid-search__input {
  flex: 1;
  min-width: 0;
}

.coar-data-grid-search__actions {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  flex-shrink: 0;
}
</style>
