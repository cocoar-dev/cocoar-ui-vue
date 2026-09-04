<template>
  <div class="demo">
    <CoarDataList :builder="builder">
      <template #toolbar-right>
        <CoarSegmentedControl v-model="layout" :options="layoutOptions" size="s" aria-label="Layout" />
      </template>

      <template #item="{ item, selected }">
        <div class="asset" :class="{ 'asset--tile': layout === 'grid' }">
          <div class="asset__thumb" :style="{ background: item.color }">
            <CoarIcon :name="item.icon" size="l" />
          </div>
          <div class="asset__text">
            <span class="asset__name">{{ item.name }}</span>
            <span class="asset__meta">{{ item.kind }} · {{ item.size }}</span>
          </div>
          <CoarIcon v-if="selected" name="check" size="s" class="asset__check" />
        </div>
      </template>
    </CoarDataList>
    <p class="demo__hint">Same data, same order, same selection — only the layout changes. Arrow keys move by tile and by row.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataList, CoarIcon, CoarSegmentedControl, useDataList } from '@cocoar/vue-ui';
import type { CoarDataListLayout } from '@cocoar/vue-ui';

interface Asset {
  id: number;
  name: string;
  kind: 'Image' | 'Document' | 'Sheet' | 'Video';
  size: string;
  icon: string;
  color: string;
}

const kinds: Array<[Asset['kind'], string, string]> = [
  ['Image', 'image', 'var(--coar-background-accent-secondary)'],
  ['Document', 'file-text', 'var(--coar-background-neutral-tertiary)'],
  ['Sheet', 'table', 'var(--coar-background-success-secondary, #dcfce7)'],
  ['Video', 'camera', 'var(--coar-background-warning-secondary, #fef3c7)'],
];

const assets: Asset[] = Array.from({ length: 48 }, (_, index) => {
  const [kind, icon, color] = kinds[index % kinds.length];
  return {
    id: index + 1,
    name: `${kind} ${String(index + 1).padStart(2, '0')}`,
    kind,
    size: `${((index * 37) % 900) + 12} KB`,
    icon,
    color,
  };
});

const layout = ref<CoarDataListLayout>('grid');
const layoutOptions = [
  { value: 'list' as const, label: 'List', icon: 'list' },
  { value: 'grid' as const, label: 'Grid', icon: 'layout-grid' },
];

const { builder } = useDataList<Asset>();
builder
  .items(assets)
  .itemKey((asset) => asset.id)
  .layout(layout)
  .tileMinWidth('11rem')
  .gap(8)
  .searchBy(['name', 'kind'])
  .sortOption('name', 'Name')
  .sortOption('kind', 'Kind')
  .selection('multiple')
  .showSearch()
  .showSort()
  .bordered()
  .height('24rem')
  .ariaLabel('Assets');
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__hint {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

/* One template, two shapes: a row in list layout, a card in grid layout. */
.asset {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
  height: 100%;
}

.asset--tile {
  flex-direction: column;
  align-items: stretch;
  gap: var(--coar-spacing-xs);
}

.asset__thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--coar-radius-xs);
  color: var(--coar-icon-neutral-secondary);
}

.asset--tile .asset__thumb {
  width: auto;
  height: 5rem;
}

.asset__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.asset__name {
  font-weight: var(--coar-font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset__meta {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.asset__check {
  color: var(--coar-icon-accent-primary);
  flex-shrink: 0;
}

.asset--tile .asset__check {
  position: absolute;
  top: var(--coar-spacing-xs);
  right: var(--coar-spacing-xs);
}

.asset--tile {
  position: relative;
}
</style>
