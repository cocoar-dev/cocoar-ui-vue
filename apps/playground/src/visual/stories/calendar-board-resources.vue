<script setup lang="ts">
/**
 * The week per resource (`<CoarCalendarBoard>`): a row per person, a shared event in each of its rows, the row of events without a person, and a row the host fills from `computeOccupancy`.
 * Events and clock: ./calendar-family-data.ts.
 */
import { ref } from 'vue';
import {
  CoarCalendarBoard,
  BOARD_UNASSIGNED_ROW,
  computeOccupancy,
  resourceWeekRows,
  type BoardRowsContext,
  useCalendar,
} from '@cocoar/vue-calendar';
import { dayParts, familyEvents, familyToday, familyZone, people, peopleIds, whoOf } from './calendar-family-data';

const { builder } = useCalendar();
builder.events(ref(familyEvents) as never).date(ref(familyToday)).timezone(familyZone).locale('en-GB').firstDayOfWeek(1);

const rows = (context: BoardRowsContext) =>
  resourceWeekRows({ dates: context.dates, resources: peopleIds, resourcesOf: whoOf, extraRows: ['free'] });
const dates = Array.from({ length: 7 }, (_, i) => familyToday.subtract({ days: 3 }).add({ days: i }));
const occupancy = computeOccupancy(familyEvents as never, {
  dates,
  periods: dayParts,
  resources: peopleIds,
  timezone: familyZone,
  resourcesOf: whoOf,
});
const label = (key: string) =>
  key === 'free' ? 'All free' : key === BOARD_UNASSIGNED_ROW ? 'Nobody' : people.find((p) => p.id === key)?.label;
</script>

<template>
  <CoarCalendarBoard :builder="builder" :rows="rows">
    <template #rowLabel="{ row }">{{ label(row.key) }}</template>
    <template #cell="{ row, date }">
      <template v-if="row.key === 'free'">
        <span v-for="part in dayParts.filter((p) => occupancy.isFree(date, p.key, peopleIds))" :key="part.key">{{ part.key }}</span>
      </template>
    </template>
  </CoarCalendarBoard>
</template>
