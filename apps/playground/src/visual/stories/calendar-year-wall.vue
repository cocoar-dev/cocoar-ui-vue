<script setup lang="ts">
/**
 * The year as a wall planner (`<CoarCalendarBoard range="year">`): twelve rows of 31 columns, a band across month ends, dots from `#cell`, weekends, today and the days a month does not have.
 * Events and clock: ./calendar-family-data.ts.
 */
import { ref } from 'vue';
import {
  CoarCalendarBoard,
  yearWallColumns,
  yearWallRows,
  type BoardRowsContext,
  useCalendar,
} from '@cocoar/vue-calendar';
import { familyEvents, familyToday, familyZone } from './calendar-family-data';

const { builder } = useCalendar();
builder.events(ref(familyEvents) as never).date(ref(familyToday)).timezone(familyZone).locale('en-GB').firstDayOfWeek(1);

const columns = yearWallColumns();
const rows = (context: BoardRowsContext) => yearWallRows({ year: context.year, locale: 'en-GB' });
</script>

<template>
  <CoarCalendarBoard :builder="builder" :rows="rows" :columns="columns" range="year">
    <template #cell="{ events }">
      <span v-if="events.length" style="width: 6px; height: 6px; border-radius: 50%; background: currentColor" />
    </template>
  </CoarCalendarBoard>
</template>
