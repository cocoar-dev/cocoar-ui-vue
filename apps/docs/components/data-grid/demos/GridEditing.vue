<template>
  <div>
    <div style="height: 320px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click any cell to edit. Enter commits, Escape cancels. Locked rows can't be edited.
    </div>
    <div
      v-if="lastChange"
      style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--coar-surface-neutral-subtle); font-size: 13px;"
    >
      Last change: <strong>{{ lastChange.name }}</strong>'s
      <strong>{{ lastChange.field }}</strong> —
      <code>{{ lastChange.oldValue }}</code> → <code>{{ lastChange.newValue }}</code>
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
  amount: number;
  locked: boolean;
}

const data = ref<Person[]>([
  { id: 1, name: 'Alice Johnson',   email: 'alice@example.com',   amount: 1200, locked: false },
  { id: 2, name: 'Bob Smith',       email: 'bob@example.com',     amount:  800, locked: true },
  { id: 3, name: 'Carol Williams',  email: 'carol@example.com',   amount: 1750, locked: false },
  { id: 4, name: 'David Brown',     email: 'david@example.com',   amount:  450, locked: false },
]);

interface Change {
  name: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}
const lastChange = shallowRef<Change | null>(null);

const builder = CoarGridBuilder.create<Person>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).editable((row) => !row.locked),
    (col) => col.field('email').header('Email').flex(1).editable((row) => !row.locked),
    (col) => col.number('amount').header('Amount').width(120).editable((row) => !row.locked),
    (col) => col.field('locked').header('Locked').width(100),
  ])
  .rowDataRef(data)
  .onCellValueChanged((event) => {
    if (!event.data || !event.colDef.field) return;
    lastChange.value = {
      name: event.data.name,
      field: event.colDef.field,
      oldValue: event.oldValue,
      newValue: event.newValue,
    };
  });
</script>
