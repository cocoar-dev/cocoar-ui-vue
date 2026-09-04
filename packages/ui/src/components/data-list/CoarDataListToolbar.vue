<script setup lang="ts" generic="T">
import { computed } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarButton } from '../button';
import { CoarIcon } from '../icon';
import { CoarSelect } from '../select';
import { CoarTextInput } from '../text-input';
import type { CoarDataListSort, CoarDataListSortOption } from './types';

const props = withDefaults(
  defineProps<{
    showSearch?: boolean;
    showSort?: boolean;
    searchPlaceholder?: string;
    sortOptions?: readonly CoarDataListSortOption<T>[];
    disabled?: boolean;
  }>(),
  {
    showSearch: false,
    showSort: false,
    searchPlaceholder: undefined,
    sortOptions: () => [],
    disabled: false,
  },
);

const search = defineModel<string>('search', { default: '' });
const sort = defineModel<CoarDataListSort | null>('sort', { default: null });

const { t } = useI18n();

const placeholder = computed(
  () => props.searchPlaceholder ?? t('coar.ui.dataList.search', undefined, 'Search…'),
);

const sortSelectOptions = computed(() =>
  props.sortOptions.map((option) => ({ value: option.key, label: option.label })),
);

const sortKey = computed(() => sort.value?.key ?? null);
const descending = computed(() => sort.value?.direction === 'desc');

const directionLabel = computed(() =>
  descending.value
    ? t('coar.ui.dataList.descending', undefined, 'Descending')
    : t('coar.ui.dataList.ascending', undefined, 'Ascending'),
);

function onSortKeyChange(key: string | null | undefined) {
  if (key === null || key === undefined) {
    sort.value = null;
    return;
  }
  const option = props.sortOptions.find((candidate) => candidate.key === key);
  sort.value = { key, direction: option?.defaultDirection ?? 'asc' };
}

function toggleDirection() {
  if (!sort.value) return;
  sort.value = { key: sort.value.key, direction: descending.value ? 'asc' : 'desc' };
}
</script>

<template>
  <div class="coar-data-list-toolbar">
    <slot name="left" />

    <CoarTextInput
      v-if="showSearch"
      v-model="search"
      class="coar-data-list-toolbar__search"
      :placeholder="placeholder"
      :disabled="disabled"
      size="s"
      clearable
    >
      <template #prefix>
        <CoarIcon name="search" source="coar-builtin" size="s" />
      </template>
    </CoarTextInput>
    <div v-else class="coar-data-list-toolbar__spacer" />

    <div v-if="showSort && sortOptions.length > 0" class="coar-data-list-toolbar__sort">
      <CoarSelect
        class="coar-data-list-toolbar__sort-select"
        :model-value="sortKey"
        :options="sortSelectOptions"
        :placeholder="t('coar.ui.dataList.sortBy', undefined, 'Sort by')"
        :disabled="disabled"
        size="s"
        clearable
        @update:model-value="onSortKeyChange"
      />
      <CoarButton
        variant="ghost"
        size="s"
        :icon-start="descending ? 'sort-desc' : 'sort-asc'"
        :aria-label="directionLabel"
        :title="directionLabel"
        :disabled="disabled || !sort"
        @click="toggleDirection"
      />
    </div>

    <slot name="right" />
  </div>
</template>

<style scoped>
.coar-data-list-toolbar {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  padding: var(--coar-spacing-xs) 0;
  min-width: 0;
}

.coar-data-list-toolbar__search {
  flex: 1 1 12rem;
  min-width: 8rem;
}

.coar-data-list-toolbar__spacer {
  flex: 1;
}

.coar-data-list-toolbar__sort {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xxs);
  flex-shrink: 0;
}

.coar-data-list-toolbar__sort-select {
  min-width: 9rem;
}
</style>
