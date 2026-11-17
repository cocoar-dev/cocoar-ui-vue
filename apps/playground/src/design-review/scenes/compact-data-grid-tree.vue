<script setup lang="ts">
/**
 * The tree renderer of `<CoarDataGrid>`: expand toggles (20px, 44px on touch in the
 * compact profile), indentation, child counts as caption text, and the quick-filter
 * highlight. Profile-neutral: the design-review gallery (or a visual story) puts
 * `.coar-compact` / `.coar-mobile` on an ancestor. Fixed data.
 */
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: string;
  modified: string;
  children?: FileNode[];
}

const files: FileNode[] = [
  {
    id: '1', name: 'src', type: 'folder', modified: '2024-03-15', children: [
      {
        id: '1-1', name: 'components', type: 'folder', modified: '2024-03-14', children: [
          { id: '1-1-1', name: 'Button.vue', type: 'file', size: '2.4 KB', modified: '2024-03-10' },
          { id: '1-1-2', name: 'Input.vue', type: 'file', size: '3.1 KB', modified: '2024-03-12' },
        ],
      },
      { id: '1-2', name: 'utils', type: 'folder', modified: '2024-03-13', children: [
        { id: '1-2-1', name: 'format.ts', type: 'file', size: '1.2 KB', modified: '2024-03-13' },
      ] },
      { id: '1-3', name: 'App.vue', type: 'file', size: '1.5 KB', modified: '2024-03-15' },
    ],
  },
  { id: '2', name: 'public', type: 'folder', modified: '2024-02-20', children: [
    { id: '2-1', name: 'index.html', type: 'file', size: '0.5 KB', modified: '2024-02-20' },
  ] },
  { id: '3', name: 'package.json', type: 'file', size: '1.1 KB', modified: '2024-03-15' },
];

const openRows = ref<string[]>(['1', '1-1']);
const search = ref('vue');

const builder = CoarGridBuilder.create<FileNode>()
  .columns([
    (col) => col.tree('name').header('Name').flex(2),
    (col) => col.field('type').header('Type').width(90),
    (col) => col.field('size').header('Size').width(90),
    (col) => col.field('modified').header('Modified').width(120),
  ])
  .treeData({ children: (row) => row.children ?? [], rowId: (row) => row.id })
  .openRows(openRows)
  .rowData(files)
  .searchHighlight();
</script>

<template>
  <div style="height: 340px; display: flex">
    <CoarDataGrid v-model:search="search" :builder="builder" show-search elevated />
  </div>
</template>
