<template>
  <div class="demo">
    <div class="demo__bar">
      <span class="demo__label">Children as</span>
      <CoarSegmentedControl v-model="childLayout" :options="layoutOptions" size="s" aria-label="Child layout" />
      <span class="demo__hint">One open folder per row — open another in the same row and the first closes.</span>
    </div>

    <CoarDataList :builder="builder">
      <template #item="{ item, depth, hasChildren, expanded }">
        <div class="folder" :class="{ 'folder--child': depth > 0 }">
          <div class="folder__icon" :class="`folder__icon--${item.kind}`">
            <CoarIcon :name="item.kind === 'folder' ? 'folder' : item.kind === 'image' ? 'image' : 'file-text'" size="l" />
          </div>
          <div class="folder__text">
            <span class="folder__name">{{ item.name }}</span>
            <span class="folder__meta">
              <template v-if="hasChildren">{{ item.children!.length }} items{{ expanded ? '' : ' · open' }}</template>
              <template v-else>{{ item.size }}</template>
            </span>
          </div>
        </div>
      </template>
    </CoarDataList>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataList, CoarIcon, CoarSegmentedControl, useDataList } from '@cocoar/vue-ui';
import type { CoarDataListLayout } from '@cocoar/vue-ui';

interface Entry {
  id: string;
  name: string;
  kind: 'folder' | 'image' | 'document';
  size?: string;
  children?: Entry[];
}

const file = (id: string, name: string, kind: 'image' | 'document', size: string): Entry => ({ id, name, kind, size });

const entries: Entry[] = [
  { id: 'brand', name: 'Brand', kind: 'folder', children: [
    file('brand-logo', 'Logo.svg', 'image', '12 KB'),
    file('brand-guide', 'Guidelines.pdf', 'document', '2.4 MB'),
    file('brand-palette', 'Palette.png', 'image', '310 KB'),
  ] },
  file('cover', 'Cover.jpg', 'image', '1.9 MB'),
  { id: 'release', name: 'Release 3.2', kind: 'folder', children: [
    file('rel-notes', 'Notes.md', 'document', '4 KB'),
    file('rel-shot-1', 'Screenshot 1.png', 'image', '640 KB'),
    file('rel-shot-2', 'Screenshot 2.png', 'image', '655 KB'),
    file('rel-shot-3', 'Screenshot 3.png', 'image', '612 KB'),
    file('rel-shot-4', 'Screenshot 4.png', 'image', '598 KB'),
  ] },
  file('contract', 'Contract.docx', 'document', '96 KB'),
  { id: 'archive', name: 'Archive', kind: 'folder', children: [
    file('arch-2024', '2024.zip', 'document', '48 MB'),
    { id: 'arch-old', name: 'Older', kind: 'folder', children: [file('arch-2023', '2023.zip', 'document', '41 MB')] },
  ] },
  file('invoice', 'Invoice 0917.pdf', 'document', '71 KB'),
  file('sketch', 'Sketch.png', 'image', '220 KB'),
];

const childLayout = ref<CoarDataListLayout>('grid');
const layoutOptions = [
  { value: 'grid' as const, label: 'Tiles', icon: 'layout-grid' },
  { value: 'list' as const, label: 'Rows', icon: 'list' },
];

const { builder } = useDataList<Entry>();
builder
  .items(entries)
  .itemKey((entry) => entry.id)
  .layout('grid')
  .tileMinWidth('10rem')
  .tileCards()
  .bandElevated()
  .gap(8)
  // Child levels are lists of their own — here their layout follows the toggle above.
  .children((entry) => entry.children, (level) => level.layout(childLayout.value).tileMinWidth('9rem'))
  .expanded(['brand'])
  .selection('single')
  .bordered()
  .height('26rem')
  .ariaLabel('Files');

// The level builder captured a value; re-apply when the toggle changes.
import { watch } from 'vue';
watch(childLayout, (layout) => {
  builder.children((entry) => entry.children, (level) => level.layout(layout).tileMinWidth('9rem'));
});
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__bar {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  flex-wrap: wrap;
}

.demo__label,
.demo__hint {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.demo__hint {
  margin-left: auto;
}

.folder {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
  min-width: 0;
}

.folder--child {
  flex-direction: row;
  align-items: center;
}

.folder__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 3.5rem;
  border-radius: var(--coar-radius-xs);
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-icon-neutral-secondary);
}

.folder--child .folder__icon {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
}

.folder__icon--folder {
  background: var(--coar-background-accent-secondary);
  color: var(--coar-icon-accent-primary);
}

.folder__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.folder__name {
  font-weight: var(--coar-font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder__meta {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}
</style>
