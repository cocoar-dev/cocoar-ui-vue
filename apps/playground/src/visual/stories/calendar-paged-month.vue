<script setup lang="ts">
/**
 * One month at a time (`<CoarPagedMonthView>`): equal rows, a selected day, and `#dayContent` drawing three marks per day from `computeOccupancy`, faint on the days of the neighbouring months.
 * Events and clock: ./calendar-family-data.ts.
 */
import { ref } from 'vue';
import {
  CoarPagedMonthView,
  computeOccupancy,
  useCalendar,
} from '@cocoar/vue-calendar';
import { dayParts, familyEvents, familyToday, familyZone, peopleIds, whoOf } from './calendar-family-data';

const { builder } = useCalendar();
builder
  .view('month')
  .monthPresentation('paged')
  .events(ref(familyEvents) as never)
  .date(ref(familyToday))
  .selectedDate(familyToday)
  .timezone(familyZone)
  .locale('en-GB')
  .firstDayOfWeek(1);

const first = familyToday.with({ day: 1 });
const dates = Array.from({ length: 50 }, (_, i) => first.subtract({ days: 7 }).add({ days: i }));
const occupancy = computeOccupancy(familyEvents as never, {
  dates,
  periods: dayParts,
  resources: peopleIds,
  timezone: familyZone,
  resourcesOf: whoOf,
});
</script>

<template>
  <CoarPagedMonthView :builder="builder">
    <template #dayContent="{ date, isOtherMonth }">
      <span :style="{ display: 'flex', gap: '2px', justifyContent: 'flex-end', opacity: isOtherMonth ? 0.4 : 1 }">
        <i
          v-for="part in dayParts"
          :key="part.key"
          :style="{
            width: '10px',
            height: '3px',
            borderRadius: '2px',
            background: occupancy.busyResources(date, part.key).length ? 'var(--coar-text-subtle, #6c7280)' : 'var(--coar-calendar-border, #d1d5db)',
          }"
        />
      </span>
    </template>
  </CoarPagedMonthView>
</template>
