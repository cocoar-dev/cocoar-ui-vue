<template>
  <div>
    <div style="height: 320px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click any date cell. Cell value is <code>Temporal.PlainDate</code> — the renderer formats locale-aware, the editor opens <code>CoarPlainDatePicker</code>.
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
import { Temporal } from '@js-temporal/polyfill';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Task {
  id: number;
  title: string;
  startsOn: Temporal.PlainDate | null;
  dueOn: Temporal.PlainDate | null;
}

const data = ref<Task[]>([
  { id: 1, title: 'Write spec',     startsOn: Temporal.PlainDate.from('2026-05-12'), dueOn: Temporal.PlainDate.from('2026-05-15') },
  { id: 2, title: 'Implement',      startsOn: Temporal.PlainDate.from('2026-05-16'), dueOn: Temporal.PlainDate.from('2026-05-22') },
  { id: 3, title: 'Review',         startsOn: null,                                  dueOn: Temporal.PlainDate.from('2026-05-25') },
  { id: 4, title: 'Deploy',         startsOn: Temporal.PlainDate.from('2026-05-26'), dueOn: null },
]);

const lastChange = shallowRef<{ row: string; field: string; newValue: string } | null>(null);

const builder = CoarGridBuilder.create<Task>()
  .columns([
    (col) => col.field('title').header('Title').flex(1),
    (col) =>
      col
        .plainDate('startsOn', (d) => d.size('s').highlightWeekends())
        .header('Starts')
        .width(160)
        .editable(true),
    (col) =>
      col
        .plainDate('dueOn', (d) =>
          d.size('s').showWeekNumbers().min(Temporal.PlainDate.from('2026-01-01')),
        )
        .header('Due')
        .width(160)
        .editable(true),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus()
  .onCellValueChanged((event) => {
    if (!event.data || !event.colDef.field) return;
    const v = event.newValue as Temporal.PlainDate | null;
    lastChange.value = {
      row: event.data.title,
      field: event.colDef.field,
      newValue: v?.toString() ?? '∅',
    };
  });
</script>
