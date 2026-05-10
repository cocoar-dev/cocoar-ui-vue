<template>
  <div style="height: 320px;">
    <CoarDataGrid :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Feature {
  id: number;
  name: string;
  enabled: boolean;
  rolloutComplete: boolean;
  partial: boolean;
}

const data = ref<Feature[]>([
  { id: 1, name: 'Dark mode',       enabled: true,  rolloutComplete: true,  partial: false },
  { id: 2, name: 'Calendar view',   enabled: true,  rolloutComplete: false, partial: true  },
  { id: 3, name: 'Bulk export',     enabled: false, rolloutComplete: false, partial: false },
  { id: 4, name: 'Beta dashboard',  enabled: true,  rolloutComplete: false, partial: true  },
]);

const builder = CoarGridBuilder.create<Feature>()
  .columns([
    (col) => col.field('name').header('Feature').flex(1),
    // editable, no label
    (col) =>
      col
        .checkbox('enabled')
        .header('Enabled')
        .width(110)
        .editable(true),
    // editable + tri-state indeterminate when partial rollout
    (col) =>
      col
        .checkbox('rolloutComplete', (c) => c.indeterminate((row) => row.partial && !row.rolloutComplete))
        .header('Rollout')
        .width(110)
        .editable(true),
    // read-only indicator (no .editable())
    (col) =>
      col
        .checkbox('partial')
        .header('Partial')
        .width(110),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus();
</script>
