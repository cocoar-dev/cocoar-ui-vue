<script setup lang="ts">
/**
 * The week as a board (`<CoarCalendarBoard>`): days by morning, afternoon and evening, bars in the all-day row, a row the host fills, today and the past.
 * Events and clock: ./calendar-family-data.ts.
 */
import { ref } from 'vue';
import {
  CoarCalendarBoard,
  BOARD_ALL_DAY_ROW,
  weekBoardRows,
  type BoardRowsContext,
  useCalendar,
} from '@cocoar/vue-calendar';
import { dayParts, familyEvents, familyToday, familyZone } from './calendar-family-data';

const { builder } = useCalendar();
builder.events(ref(familyEvents) as never).date(ref(familyToday)).timezone(familyZone).locale('en-GB').firstDayOfWeek(1);

const labels: Record<string, string> = {
  [BOARD_ALL_DAY_ROW]: 'All day',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  meals: 'Dinner',
};
const meals = ['Soup', 'Pasta', 'Curry', 'Vegetables', 'Fish', 'Pizza', 'Roast'];
const rows = (context: BoardRowsContext) =>
  weekBoardRows({ dates: context.dates, periods: dayParts, timezone: context.timezone, extraRows: ['meals'] });
</script>

<template>
  <CoarCalendarBoard :builder="builder" :rows="rows">
    <template #rowLabel="{ row }">{{ labels[row.key] }}</template>
    <template #cell="{ row, date }">
      <span v-if="row.key === 'meals'">{{ meals[date.dayOfWeek - 1] }}</span>
    </template>
  </CoarCalendarBoard>
</template>
