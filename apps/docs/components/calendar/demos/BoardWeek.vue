<template>
  <div style="border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarCalendarBoard :builder="builder" :rows="rows">
      <template #rowLabel="{ row }">{{ labels[row.key] }}</template>
      <template #cell="{ row, date }">
        <span v-if="row.key === 'meals'" style="color: var(--coar-text-subtle)">{{ meals[date.dayOfWeek - 1] }}</span>
      </template>
    </CoarCalendarBoard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  BOARD_ALL_DAY_ROW,
  CoarCalendarBoard,
  Temporal,
  useCalendar,
  weekBoardRows,
  type BoardRowsContext,
  type CalendarEvent,
  type CalendarPeriod,
} from '@cocoar/vue-calendar';

const periods: CalendarPeriod[] = [
  { key: 'morning', startMinutes: 0, endMinutes: 12 * 60 },
  { key: 'afternoon', startMinutes: 12 * 60, endMinutes: 18 * 60 },
  { key: 'evening', startMinutes: 18 * 60, endMinutes: 24 * 60 },
];
const labels: Record<string, string> = {
  [BOARD_ALL_DAY_ROW]: 'All day',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  meals: 'Dinner',
};
const meals = ['Soup', 'Pasta', 'Curry', 'Tacos', 'Fish', 'Pizza', 'Roast'];

const zdt = (iso: string) => Temporal.ZonedDateTime.from(`${iso}[Europe/Vienna]`);
const events = ref<CalendarEvent[]>([
  { id: 'camp', start: Temporal.PlainDate.from('2026-11-17'), end: Temporal.PlainDate.from('2026-11-20'), meta: { title: 'Project week', color: '#7c3aed' } },
  { id: 'dentist', start: zdt('2026-11-16T09:00'), end: zdt('2026-11-16T10:00'), meta: { title: 'Dentist', color: '#0891b2' } },
  { id: 'training', start: zdt('2026-11-19T15:30'), end: zdt('2026-11-19T17:00'), meta: { title: 'Training', color: '#2f855a' } },
  { id: 'parents', start: zdt('2026-11-19T19:00'), end: zdt('2026-11-19T20:30'), meta: { title: 'Parents evening', color: '#c05621' } },
  { id: 'hike', start: zdt('2026-11-22T10:00'), end: zdt('2026-11-22T15:00'), meta: { title: 'Hike', color: '#2563eb' } },
]);

const { builder } = useCalendar();
builder
  .view('week')
  .date(Temporal.PlainDate.from('2026-11-19'))
  .timezone('Europe/Vienna')
  .locale('en-GB')
  .firstDayOfWeek(1)
  .events(events);

const rows = (context: BoardRowsContext) =>
  weekBoardRows({ dates: context.dates, periods, timezone: context.timezone, extraRows: ['meals'] });
</script>
