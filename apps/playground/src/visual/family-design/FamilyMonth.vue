<script setup lang="ts">
/**
 * The month of the family calendar design.
 * Styled only through public tokens and slots: ./skin.css.
 */
import './skin.css';
import { ref } from 'vue';
import { CoarMonthView, computeOccupancy, useMonthView } from '@cocoar/vue-calendar';
import { dayParts, familyEvents, familyToday, familyZone, peopleIds, whoOf } from '../stories/calendar-family-data';
import { cardStyle, titleOf } from './skin';

const props = defineProps<{ width: number; height: number }>();

const { builder } = useMonthView();
builder
  .events(ref(familyEvents) as never)
  .date(ref(familyToday))
  .selectedDate(familyToday)
  .timezone(familyZone)
  .locale('de-AT')
  .firstDayOfWeek(1)
  .monthRowSizing('fill')
  .weekdayFormat('short');

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
  <div class="family-design family-design--month" :style="{ width: `${props.width}px`, height: `${props.height}px` }">
    <CoarMonthView :builder="builder">
      <template #dayContent="{ date }">
        <span class="family-marks">
          <i
            v-for="part in dayParts"
            :key="part.key"
            :style="occupancy.busyResources(date, part.key).length ? { background: 'var(--muted)' } : undefined"
          />
        </span>
      </template>
      <template #pill="{ event }">
        <div class="family-line" :style="cardStyle(event)"><i /><span>{{ titleOf(event) }}</span></div>
      </template>
      <template #multiDayBar="{ event }">
        <div class="family-month-bar" :style="cardStyle(event)">{{ titleOf(event) }}</div>
      </template>
    </CoarMonthView>
  </div>
</template>