<script setup lang="ts">
import { computed, ref } from 'vue';
import type { IHeaderParams } from 'ag-grid-community';
import { useI18n } from '@cocoar/vue-localization';
import { COAR_HEADER_I18N_KEY } from '../builders/coar-grid-column-builder';

const props = defineProps<{
  params: IHeaderParams;
}>();

const { t } = useI18n();

const i18nKey = computed<string | undefined>(
  () => (props.params.column.getColDef() as Record<string, unknown>)[COAR_HEADER_I18N_KEY] as string | undefined,
);

const displayName = computed(() =>
  i18nKey.value
    ? t(i18nKey.value, undefined, props.params.displayName)
    : props.params.displayName,
);

// Sort state
const sortOrder = ref<'asc' | 'desc' | null>(null);

function onSortChanged() {
  const col = props.params.column;
  if (col.isSortAscending()) sortOrder.value = 'asc';
  else if (col.isSortDescending()) sortOrder.value = 'desc';
  else sortOrder.value = null;
}

// Listen for sort changes
props.params.column.addEventListener('sortChanged', onSortChanged);
onSortChanged();

function onSortClick(event: MouseEvent) {
  props.params.progressSort(event.shiftKey);
}
</script>

<template>
  <div
    class="coar-grid-header"
    :class="{ 'coar-grid-header--sortable': params.enableSorting }"
    @click="onSortClick"
  >
    <span class="coar-grid-header__label">{{ displayName }}</span>
    <span class="coar-grid-header__spacer" />
    <span v-if="sortOrder" class="coar-grid-header__sort-icon">
      {{ sortOrder === 'asc' ? '&#9650;' : '&#9660;' }}
    </span>
  </div>
</template>

<style>
.coar-grid-header {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  gap: 4px;
  overflow: hidden;
}

.coar-grid-header--sortable {
  cursor: pointer;
}

.coar-grid-header__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-grid-header__spacer {
  flex: 1;
}

.coar-grid-header__sort-icon {
  font-size: 0.65em;
  opacity: 0.6;
  flex-shrink: 0;
}
</style>
