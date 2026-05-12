<template>
  <div>
    <div style="height: 320px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click <code>startsAt</code>. Cell value is <code>Temporal.ZonedDateTime</code> — same instant displayed in each event's own zone. Each row's zone is preserved through editing unless the user explicitly changes it via the picker.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Meeting {
  id: number;
  title: string;
  startsAt: Temporal.ZonedDateTime | null;
}

const data = ref<Meeting[]>([
  { id: 1, title: 'EU sync',  startsAt: Temporal.ZonedDateTime.from('2026-05-13T10:00:00[Europe/Vienna]') },
  { id: 2, title: 'US sync',  startsAt: Temporal.ZonedDateTime.from('2026-05-13T15:00:00[America/New_York]') },
  { id: 3, title: 'AP sync',  startsAt: Temporal.ZonedDateTime.from('2026-05-14T09:00:00[Asia/Tokyo]') },
  { id: 4, title: 'No slot',  startsAt: null },
]);

const builder = CoarGridBuilder.create<Meeting>()
  .columns([
    (col) => col.field('title').header('Meeting').flex(1),
    (col) =>
      col
        .zonedDateTime('startsAt', (d) =>
          d.size('s').timeZone('Europe/Vienna').timezoneFilter(['Europe/*', 'America/*', 'Asia/*']),
        )
        .header('Starts at')
        .width(280)
        .editable(true),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus();
</script>
