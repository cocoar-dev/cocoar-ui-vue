<template>
  <div>
    <div style="height: 280px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click any cell. Cell value is <code>Temporal.PlainDateTime</code> — a floating wallclock (no zone).
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Reminder {
  id: number;
  title: string;
  at: Temporal.PlainDateTime | null;
}

const data = ref<Reminder[]>([
  { id: 1, title: 'Morning standup', at: Temporal.PlainDateTime.from('2026-05-13T09:00:00') },
  { id: 2, title: 'Code review',     at: Temporal.PlainDateTime.from('2026-05-13T14:30:00') },
  { id: 3, title: 'No reminder yet', at: null },
]);

const builder = CoarGridBuilder.create<Reminder>()
  .columns([
    (col) => col.field('title').header('Title').flex(1),
    (col) =>
      col
        .plainDateTime('at', (d) => d.size('s'))
        .header('When')
        .width(220)
        .editable(true),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus();
</script>
