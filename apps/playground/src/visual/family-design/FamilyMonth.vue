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

const meals = ['Suppe', 'Pasta', 'Curry', 'Ofengemüse', 'Fisch', 'Pizza', 'Braten'];
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
      <template #dayFooter="{ date, isOtherMonth }">
        <div v-if="!isOtherMonth && familyToday.until(date).days >= 0" class="family-meal-foot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
            <path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 3c-2 1-3 4-3 7 0 2 1 3 3 3v8" />
          </svg>
          <span>{{ meals[date.dayOfWeek - 1] }}</span>
        </div>
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