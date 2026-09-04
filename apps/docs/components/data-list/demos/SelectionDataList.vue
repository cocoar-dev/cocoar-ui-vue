<template>
  <div class="demo">
    <CoarDataList
      v-model:selected="selected"
      :items="files"
      :item-key="(file) => file.path"
      selection="multiple"
      :gap="4"
      bordered
      height="18rem"
      @item-contextmenu="onContextMenu"
    >
      <template #toolbar-left>
        <span class="demo__title">Attachments</span>
      </template>
      <template #toolbar-right>
        <CoarButton variant="secondary" size="s" :disabled="selected.length === 0" @click="removeSelected">
          Remove {{ selected.length || '' }}
        </CoarButton>
      </template>

      <template #item="{ item, selected: isSelected, toggle }">
        <div class="file">
          <CoarCheckbox :model-value="isSelected" size="s" @update:model-value="toggle()" @click.stop />
          <CoarIcon :name="item.kind === 'image' ? 'image' : 'file-text'" size="m" />
          <div class="file__text">
            <span class="file__name">{{ item.name }}</span>
            <span class="file__meta">{{ item.path }} · {{ item.size }}</span>
          </div>
        </div>
      </template>
    </CoarDataList>

    <CoarContextMenu :menu="menu">
      <CoarMenuItem label="Download" icon="download" @click="log('download')" />
      <CoarMenuItem label="Rename" icon="pencil" :disabled="selected.length !== 1" @click="log('rename')" />
      <CoarMenuDivider />
      <CoarMenuItem label="Remove" icon="x" @click="removeSelected" />
    </CoarContextMenu>

    <p class="demo__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarButton,
  CoarCheckbox,
  CoarContextMenu,
  CoarDataList,
  CoarIcon,
  CoarMenuDivider,
  CoarMenuItem,
  useContextMenu,
} from '@cocoar/vue-ui';
import type { CoarDataListItemEvent, CoarDataListKey } from '@cocoar/vue-ui';

interface FileRow {
  path: string;
  name: string;
  size: string;
  kind: 'image' | 'document';
}

const files = ref<FileRow[]>([
  { path: '/2026/offer.pdf', name: 'Offer.pdf', size: '184 KB', kind: 'document' },
  { path: '/2026/floorplan.png', name: 'Floorplan.png', size: '2.1 MB', kind: 'image' },
  { path: '/2026/notes.md', name: 'Notes.md', size: '3 KB', kind: 'document' },
  { path: '/2026/site.jpg', name: 'Site.jpg', size: '4.7 MB', kind: 'image' },
  { path: '/2026/contract.docx', name: 'Contract.docx', size: '96 KB', kind: 'document' },
  { path: '/2026/invoice-0917.pdf', name: 'Invoice 0917.pdf', size: '71 KB', kind: 'document' },
]);

const selected = ref<CoarDataListKey[]>([]);
const menu = useContextMenu();
const hint = ref('Tap the checkbox or use Ctrl/Shift+Click. Right-click for actions.');

function onContextMenu(event: CoarDataListItemEvent<FileRow>) {
  // The list already selected the item under the pointer (unless it was part of the selection).
  menu.open(event.event as MouseEvent);
}

function removeSelected() {
  const keys = new Set(selected.value);
  files.value = files.value.filter((file) => !keys.has(file.path));
  hint.value = `Removed ${keys.size} file(s).`;
  selected.value = [];
}

function log(action: string) {
  hint.value = `${action}: ${selected.value.join(', ')}`;
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__title {
  font-weight: var(--coar-font-weight-semibold);
}

.demo__hint {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.file {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.file__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file__meta {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
