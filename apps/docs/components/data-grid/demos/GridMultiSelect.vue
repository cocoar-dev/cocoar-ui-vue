<template>
  <div>
    <div style="height: 380px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click <code>tags</code> for a checkbox-list dropdown (multi-select). Double-click <code>skills</code> for a chip-style trigger (tag-select). Both cells store <code>T[]</code>; commit happens on click-outside / Tab / Enter.
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
  tags: string[];
  skills: string[];
}

const TAGS = [
  { value: 'priority', label: 'Priority' },
  { value: 'remote',   label: 'Remote' },
  { value: 'onsite',   label: 'Onsite' },
  { value: 'lead',     label: 'Lead' },
  { value: 'intern',   label: 'Intern' },
];

const SKILLS = [
  { value: 'ts',  label: 'TypeScript' },
  { value: 'vue', label: 'Vue' },
  { value: 'go',  label: 'Go' },
  { value: 'sql', label: 'SQL' },
  { value: 'k8s', label: 'Kubernetes' },
];

const data = ref<Person[]>([
  { id: 1, name: 'Alice Johnson',  tags: ['priority', 'remote'], skills: ['ts', 'vue'] },
  { id: 2, name: 'Bob Smith',      tags: ['onsite'],             skills: ['go', 'sql'] },
  { id: 3, name: 'Carol Williams', tags: ['lead', 'priority'],   skills: ['ts', 'k8s'] },
  { id: 4, name: 'David Brown',    tags: [],                     skills: ['vue'] },
]);

const lastChange = shallowRef<{ row: string; field: string; newValue: string } | null>(null);

const builder = CoarGridBuilder.create<Person>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),

    // col.multiSelect — checkbox-list dropdown, chips renderer
    (col) =>
      col
        .multiSelect('tags', (s) =>
          s.options(TAGS).searchable().showSelectAll().display('chips'),
        )
        .header('Tags (multiSelect)')
        .width(260)
        .editable(true),

    // col.tagSelect — chip-style trigger, allow-create, text renderer (default)
    (col) =>
      col
        .tagSelect('skills', (s) => s.options(SKILLS).allowCreate())
        .header('Skills (tagSelect)')
        .width(260)
        .editable(true),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus()
  .onCellValueChanged((event) => {
    if (!event.data || !event.colDef.field) return;
    const next = event.newValue;
    lastChange.value = {
      row: event.data.name,
      field: event.colDef.field,
      newValue: Array.isArray(next) ? `[${next.join(', ')}]` : String(next),
    };
  });
</script>
