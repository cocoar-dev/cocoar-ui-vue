<script setup lang="ts" generic="TData = unknown">
import { computed } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarButton, CoarCheckbox, CoarPopover } from '@cocoar/vue-ui';
import type { CoarGridColumnItem, CoarGridColumns } from './builders';

const props = withDefaults(
  defineProps<{
    /** Headless column model to display and control. */
    model: CoarGridColumns<TData>;
    /** Optional trigger label override. */
    label?: string;
  }>(),
  {
    label: undefined,
  },
);

const { t } = useI18n();

const items = computed(() => props.model.items.value);
const visibleCount = computed(() => items.value.filter((item) => item.visible).length);
const allVisible = computed(() => items.value.every((item) => item.visible || !item.canHide));
const isDefaultVisibility = computed(() =>
  items.value.every((item) => item.visible === item.defaultVisible),
);

const buttonLabel = computed(
  () => props.label ?? t('coar.dataGrid.columnPicker.button', undefined, 'Columns'),
);

const visibleSummary = computed(() =>
  t(
    'coar.dataGrid.columnPicker.visibleCount',
    { visible: visibleCount.value, total: items.value.length },
    `${visibleCount.value} of ${items.value.length} visible`,
  ),
);

function displayLabel(item: CoarGridColumnItem): string {
  return item.i18nKey ? t(item.i18nKey, undefined, item.label) : item.label;
}

function isDisabled(item: CoarGridColumnItem): boolean {
  return !item.canHide || (item.visible && visibleCount.value <= 1);
}
</script>

<template>
  <CoarPopover mode="click" :offset="4" :disabled="items.length === 0">
    <CoarButton variant="secondary" size="s" icon-start="columns" :aria-label="buttonLabel">
      {{ buttonLabel }}
    </CoarButton>

    <template #content>
      <div class="coar-grid-column-picker">
        <div class="coar-grid-column-picker__header">
          <strong>{{ t('coar.dataGrid.columnPicker.title', undefined, 'Visible columns') }}</strong>
          <span>{{ visibleSummary }}</span>
        </div>

        <div class="coar-grid-column-picker__list">
          <CoarCheckbox
            v-for="item in items"
            :key="item.id"
            :model-value="item.visible"
            :label="displayLabel(item)"
            :disabled="isDisabled(item)"
            size="s"
            @update:model-value="model.setVisible(item.id, $event)"
          />
        </div>

        <div class="coar-grid-column-picker__footer">
          <CoarButton variant="ghost" size="xs" :disabled="allVisible" @click="model.showAll()">
            {{ t('coar.dataGrid.columnPicker.showAll', undefined, 'Show all') }}
          </CoarButton>
          <CoarButton
            variant="ghost"
            size="xs"
            :disabled="isDefaultVisibility"
            @click="model.resetVisibility()"
          >
            {{ t('coar.dataGrid.columnPicker.restoreDefaults', undefined, 'Restore defaults') }}
          </CoarButton>
        </div>
      </div>
    </template>
  </CoarPopover>
</template>

<style scoped>
.coar-grid-column-picker {
  display: flex;
  flex-direction: column;
  min-width: 15rem;
  max-width: min(20rem, calc(100vw - 2rem));
  color: var(--coar-text-neutral-primary);
}

.coar-grid-column-picker__header {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xxs);
  padding-bottom: var(--coar-spacing-s);
}

.coar-grid-column-picker__header strong {
  font-size: var(--coar-component-s-font-size);
  font-weight: var(--coar-font-weight-semi-bold);
}

.coar-grid-column-picker__header span {
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-footnote-size);
}

.coar-grid-column-picker__list {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
  max-height: 18rem;
  padding-block: var(--coar-spacing-xs);
  overflow-y: auto;
  border-block: 1px solid var(--coar-border-neutral);
}

.coar-grid-column-picker__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--coar-spacing-xs);
  padding-top: var(--coar-spacing-s);
}
</style>
