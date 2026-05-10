<template>
  <div>
    <div style="height: 280px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click the <strong>Role</strong> cell to open a select-based editor. Other columns use the default text editor.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import SelectCellEditor from './SelectCellEditor.vue';

interface User {
  id: number;
  name: string;
  role: 'Engineer' | 'Designer' | 'Manager';
}

const data = ref<User[]>([
  { id: 1, name: 'Alice Johnson',  role: 'Engineer' },
  { id: 2, name: 'Bob Smith',      role: 'Designer' },
  { id: 3, name: 'Carol Williams', role: 'Manager' },
  { id: 4, name: 'David Brown',    role: 'Engineer' },
]);

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).editable(true),
    (col) =>
      col
        .field('role')
        .header('Role')
        .width(160)
        .editable(true)
        .cellEditorConfig(SelectCellEditor, {
          options: ['Engineer', 'Designer', 'Manager'],
        }),
  ])
  .rowDataRef(data);
</script>
