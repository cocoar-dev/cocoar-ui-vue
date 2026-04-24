<script setup lang="ts">
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { CoarIcon } from '@cocoar/vue-ui';
import type {
  WrapperCellRendererConfig,
  WrapperSlotItem,
  WrapperIconSlotConfig,
  WrapperComponentSlotConfig,
  WrapperTextSlotConfig,
} from './wrapper-cell-renderer.models';
import {
  isIconSlot,
  isComponentSlot,
  isTextSlot,
  resolveAccessor,
  toSlotItems,
} from './wrapper-cell-renderer.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const config = computed<WrapperCellRendererConfig>(
  () => props.params.colDef?.cellRendererParams?.config ?? {},
);

const row = computed<unknown>(() => props.params.data);

function itemVisible(item: WrapperSlotItem): boolean {
  if (item.show && !item.show(row.value)) return false;
  if (isIconSlot(item)) {
    const icon = resolveAccessor(item.icon, row.value);
    if (!icon) return false;
  }
  if (isTextSlot(item)) {
    const text = resolveAccessor(item.text, row.value);
    if (text == null || text === '') return false;
  }
  return true;
}

const leftItems = computed(() =>
  toSlotItems(config.value.left).filter(itemVisible),
);
const rightItems = computed(() =>
  toSlotItems(config.value.right).filter(itemVisible),
);

const innerRenderer = computed(() => config.value.innerRenderer ?? null);

// Rebuild the params for the inner renderer so that factory-created renderers
// (tag, tree, date, number, currency, icon) — which read their own config via
// `params.colDef.cellRendererParams.config` — see their *own* cellRendererParams
// instead of the wrapper's config. AG Grid passes the outer (wrapped) colDef to
// us, so we override its `cellRendererParams` with the inner's original values.
const innerParams = computed<ICellRendererParams>(() => {
  const innerExtra = config.value.innerRendererParams ?? {};
  return {
    ...props.params,
    colDef: {
      ...(props.params.colDef ?? {}),
      cellRendererParams: innerExtra,
    },
    ...innerExtra,
  } as ICellRendererParams;
});

const fallbackText = computed<string>(() => {
  const p = props.params;
  return p.valueFormatted ?? (p.value != null ? String(p.value) : '');
});

function handleItemClick(item: WrapperSlotItem, event: MouseEvent): void {
  if (!item.onClick) return;
  event.stopPropagation();
  item.onClick(row.value, event);
}

function itemIsClickable(item: WrapperSlotItem): boolean {
  return !!item.onClick;
}

// ---- Icon helpers -----------------------------------------------------------
function iconName(item: WrapperIconSlotConfig): string {
  return resolveAccessor(item.icon, row.value) ?? '';
}
function iconColor(item: WrapperIconSlotConfig): string {
  return resolveAccessor(item.color, row.value) ?? 'inherit';
}
function iconTooltip(item: WrapperIconSlotConfig): string | undefined {
  return resolveAccessor(item.tooltip, row.value);
}

// ---- Component helpers ------------------------------------------------------
/**
 * Always expose `row` as an implicit prop so consumer components can access
 * the full data object without any params plumbing. User-provided `params(row)`
 * is spread on top and can override `row` if needed.
 */
function componentParams(item: WrapperComponentSlotConfig): Record<string, unknown> {
  return { row: row.value, ...(item.params?.(row.value) ?? {}) };
}

// ---- Text helpers -----------------------------------------------------------
function textContent(item: WrapperTextSlotConfig): string {
  return resolveAccessor(item.text, row.value) ?? '';
}
function textTooltip(item: WrapperTextSlotConfig): string | undefined {
  return resolveAccessor(item.tooltip, row.value);
}

function itemTooltip(item: WrapperSlotItem): string | undefined {
  if (isIconSlot(item)) return iconTooltip(item);
  if (isTextSlot(item)) return textTooltip(item);
  return undefined;
}
</script>

<template>
  <div class="coar-wrap-cell">
    <span
      v-if="leftItems.length"
      class="coar-wrap-cell__slot coar-wrap-cell__slot--left"
    >
      <span
        v-for="(item, i) in leftItems"
        :key="`l-${i}`"
        class="coar-wrap-cell__item"
        :class="{ 'coar-wrap-cell__item--clickable': itemIsClickable(item) }"
        :title="itemTooltip(item)"
        @click="(e) => handleItemClick(item, e)"
      >
        <template v-if="isIconSlot(item)">
          <CoarIcon
            :name="iconName(item)"
            :source="item.source"
            :size="item.size ?? 's'"
            :color="iconColor(item)"
          />
        </template>
        <template v-else-if="isComponentSlot(item)">
          <component :is="item.component" v-bind="componentParams(item)" />
        </template>
        <template v-else-if="isTextSlot(item)">
          {{ textContent(item) }}
        </template>
      </span>
    </span>

    <div class="coar-wrap-cell__inner">
      <component
        :is="innerRenderer"
        v-if="innerRenderer"
        :params="innerParams"
      />
      <template v-else>{{ fallbackText }}</template>
    </div>

    <span
      v-if="rightItems.length"
      class="coar-wrap-cell__slot coar-wrap-cell__slot--right"
    >
      <span
        v-for="(item, i) in rightItems"
        :key="`r-${i}`"
        class="coar-wrap-cell__item"
        :class="{ 'coar-wrap-cell__item--clickable': itemIsClickable(item) }"
        :title="itemTooltip(item)"
        @click="(e) => handleItemClick(item, e)"
      >
        <template v-if="isIconSlot(item)">
          <CoarIcon
            :name="iconName(item)"
            :source="item.source"
            :size="item.size ?? 's'"
            :color="iconColor(item)"
          />
        </template>
        <template v-else-if="isComponentSlot(item)">
          <component :is="item.component" v-bind="componentParams(item)" />
        </template>
        <template v-else-if="isTextSlot(item)">
          {{ textContent(item) }}
        </template>
      </span>
    </span>
  </div>
</template>

<style>
.coar-wrap-cell {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs, 4px);
  height: 100%;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.coar-wrap-cell__slot {
  display: inline-flex;
  align-items: center;
  gap: var(--coar-spacing-xs, 4px);
  flex-shrink: 0;
}

.coar-wrap-cell__item {
  display: inline-flex;
  align-items: center;
}

.coar-wrap-cell__item--clickable {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px;
  transition: background-color 0.1s;
}

.coar-wrap-cell__item--clickable:hover {
  background-color: var(--coar-surface-neutral-hover, rgba(0, 0, 0, 0.06));
}

.coar-wrap-cell__inner {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.coar-wrap-cell__inner > * {
  min-width: 0;
  flex: 1 1 auto;
}
</style>
