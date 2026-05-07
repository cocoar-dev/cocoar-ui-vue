<template>
  <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
    <CoarSegmentedControl
      v-model="view"
      :options="options"
      aria-label="Calendar view"
    />
    <p style="margin: 0; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Active view: <strong>{{ view }}</strong>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, type CoarSegmentedControlOption } from '@cocoar/vue-ui';

type CalendarView = 'day' | 'week' | 'month' | 'agenda';

const view = ref<CalendarView>('week');
const options: CoarSegmentedControlOption<CalendarView>[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'agenda', label: 'Agenda' },
];
</script>
