<script setup lang="ts">
/**
 * One day with a column per person (`<CoarDayView>` with resources): a
 * shared block, one broken by an overlap, the column of an event without a
 * person, an all-day band, an overlay across all columns and the now-line.
 * Events and clock: ./calendar-family-data.ts.
 */
import { ref } from 'vue';
import { CoarDayView, Temporal, useDayView } from '@cocoar/vue-calendar';
import { familyEvents, familyToday, familyZone, people, whoOf } from './calendar-family-data';

const { builder } = useDayView();
builder
  .events(ref(familyEvents) as never)
  .date(ref(familyToday))
  .timezone(familyZone)
  .locale('en-GB')
  .timeRange({ startMinutes: 7 * 60, endMinutes: 22 * 60 })
  .pixelsPerHour(44)
  .resources(people)
  .eventResources(whoOf)
  .dayOverlays(() => [
    {
      key: 'dinner',
      label: 'Dinner',
      start: Temporal.ZonedDateTime.from('2026-11-19T18:00[Europe/Vienna]'),
      end: Temporal.ZonedDateTime.from('2026-11-19T18:30[Europe/Vienna]'),
    },
  ]);
</script>

<template>
  <CoarDayView :builder="builder" />
</template>
