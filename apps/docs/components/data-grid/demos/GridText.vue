<template>
  <div>
    <div style="height: 320px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click any name or email cell. <strong>Tab</strong> commits and moves to the next editable cell, <strong>Enter</strong> commits, <strong>Escape</strong> cancels.
    </div>
    <div
      v-if="lastChange"
      style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--coar-surface-neutral-subtle); font-size: 13px;"
    >
      Last change: <strong>{{ lastChange.field }}</strong> on
      <strong>{{ lastChange.row }}</strong> →
      <code>{{ lastChange.newValue }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Person {
  id: number;
  name: string;
  email: string;
  role: string;
}

const data = ref<Person[]>([
  { id: 1, name: 'Alice Johnson',  email: 'alice@example.com',  role: 'Engineer' },
  { id: 2, name: 'Bob Smith',      email: 'bob@example.com',    role: 'Designer' },
  { id: 3, name: 'Carol Williams', email: 'carol@example.com',  role: 'Manager' },
  { id: 4, name: 'David Brown',    email: 'david@example.com',  role: 'Engineer' },
]);

const lastChange = shallowRef<{ row: string; field: string; newValue: string } | null>(null);

const builder = CoarGridBuilder.create<Person>()
  .columns([
    (col) => col.text('name', (t) => t.placeholder('Name').maxLength(80)).header('Name').flex(1).editable(true),
    (col) => col.text('email', (t) => t.placeholder('user@example.com').maxLength(120)).header('Email').flex(1).editable(true),
    (col) => col.field('role').header('Role').width(140),       // not editable
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus()
  .onCellValueChanged((event) => {
    if (!event.data || !event.colDef.field) return;
    lastChange.value = {
      row: event.data.name,
      field: event.colDef.field,
      newValue: String(event.newValue),
    };
  });
</script>
