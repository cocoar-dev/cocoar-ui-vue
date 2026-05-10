<template>
  <div>
    <div style="height: 320px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click any role / status / country cell to open the dropdown. Selecting an option auto-commits.
    </div>
    <div
      v-if="lastChange"
      style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--coar-surface-neutral-subtle); font-size: 13px;"
    >
      Last change: <strong>{{ lastChange.row }}</strong> —
      <code>{{ lastChange.field }}</code> →
      <strong>{{ lastChange.newValue }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Person {
  id: number;
  name: string;
  role: 'eng' | 'des' | 'mgr';
  status: 'active' | 'pending' | 'archived';
  country: string;
}

const ROLES = [
  { value: 'eng', label: 'Engineer' },
  { value: 'des', label: 'Designer' },
  { value: 'mgr', label: 'Manager' },
];

const STATUSES = [
  { value: 'active',   label: 'Active' },
  { value: 'pending',  label: 'Pending' },
  { value: 'archived', label: 'Archived' },
];

const COUNTRIES = [
  { value: 'AT', label: 'Austria' },
  { value: 'DE', label: 'Germany' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'IT', label: 'Italy' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'PT', label: 'Portugal' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'SE', label: 'Sweden' },
];

const data = ref<Person[]>([
  { id: 1, name: 'Alice Johnson',  role: 'eng', status: 'active',   country: 'AT' },
  { id: 2, name: 'Bob Smith',      role: 'des', status: 'pending',  country: 'DE' },
  { id: 3, name: 'Carol Williams', role: 'mgr', status: 'active',   country: 'CH' },
  { id: 4, name: 'David Brown',    role: 'eng', status: 'archived', country: 'FR' },
]);

const lastChange = shallowRef<{ row: string; field: string; newValue: string } | null>(null);

const builder = CoarGridBuilder.create<Person>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),
    (col) =>
      col
        .select('role', (s) => s.options(ROLES))
        .header('Role')
        .width(140)
        .editable(true),
    (col) =>
      col
        .select('status', (s) => s.options(STATUSES).clearable())
        .header('Status')
        .width(140)
        .editable((row) => row.status !== 'archived'),
    (col) =>
      col
        .select('country', (s) =>
          s.options(COUNTRIES).searchable().searchPlaceholder('Filter countries…'),
        )
        .header('Country')
        .width(160)
        .editable(true),
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
