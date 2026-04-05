<template>
  <div style="height: 450px;">
    <CoarDataGridPanel
      :builder="builder"
      search-placeholder="Search files..."
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGridPanel, CoarGridBuilder } from '@cocoar/vue-data-grid';

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
          { id: '1-1-3', name: 'Dialog.vue', type: 'file', size: '5.8 KB', modified: '2024-03-14' },
        ],
      },
      {
        id: '1-2', name: 'utils', type: 'folder', modified: '2024-03-13', children: [
          { id: '1-2-1', name: 'format.ts', type: 'file', size: '1.2 KB', modified: '2024-03-13' },
          { id: '1-2-2', name: 'validate.ts', type: 'file', size: '0.8 KB', modified: '2024-03-11' },
        ],
      },
      { id: '1-3', name: 'App.vue', type: 'file', size: '1.5 KB', modified: '2024-03-15' },
      { id: '1-4', name: 'main.ts', type: 'file', size: '0.3 KB', modified: '2024-03-01' },
    ],
  },
  {
    id: '2', name: 'public', type: 'folder', modified: '2024-02-20', children: [
      { id: '2-1', name: 'favicon.ico', type: 'file', size: '4.2 KB', modified: '2024-01-15' },
      { id: '2-2', name: 'index.html', type: 'file', size: '0.5 KB', modified: '2024-02-20' },
    ],
  },
  { id: '3', name: 'package.json', type: 'file', size: '1.1 KB', modified: '2024-03-15' },
  { id: '4', name: 'tsconfig.json', type: 'file', size: '0.4 KB', modified: '2024-01-10' },
  { id: '5', name: 'README.md', type: 'file', size: '2.0 KB', modified: '2024-03-05' },
];

const openRows = ref<string[]>(['1']);

const builder = CoarGridBuilder.create<FileNode>()
  .columns([
    (col) => col.tree('name').header('Name').flex(2),
    (col) => col.field('type').header('Type').width(90),
    (col) => col.field('size').header('Size').width(100),
    (col) => col.field('modified').header('Modified').width(130),
  ])
  .treeData({
    children: (row) => row.children ?? [],
    rowId: (row) => row.id,
  })
  .openRows(openRows)
  .rowData(files)
  .searchHighlight();
</script>
