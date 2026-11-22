<script setup lang="ts">
/**
 * The day with a column per person of the family calendar design.
 * Styled only through public tokens and slots: ./skin.css.
 */
import './skin.css';
import { ref } from 'vue';
import { CoarDayView, Temporal, useDayView } from '@cocoar/vue-calendar';
import { familyEvents, familyToday, familyZone, people, whoOf } from '../stories/calendar-family-data';
import { cardStyle, clock, isEveryone, personStyle, titleOf } from './skin';

const props = withDefaults(
  defineProps<{ width: number; from?: number; to?: number; hourHeight?: number; names?: boolean }>(),
  { from: 7, to: 22, hourHeight: 43, names: true },
);

const { builder } = useDayView();
builder
  .events(ref(familyEvents.filter((event) => whoOf(event).length > 0 && 'timeZoneId' in event.start)) as never)
  .date(ref(familyToday))
  .timezone(familyZone)
  .locale('de-AT')
  .timeRange({ startMinutes: props.from * 60, endMinutes: props.to * 60 })
  .pixelsPerHour(props.hourHeight)
  .resources(people)
  .eventResources(whoOf)
  .dayOverlays(() => [
    {
      key: 'dinner',
      label: 'Ofengemüse mit Feta',
      start: Temporal.ZonedDateTime.from('2026-11-19T18:00[Europe/Vienna]'),
      end: Temporal.ZonedDateTime.from('2026-11-19T18:27[Europe/Vienna]'),
    },
  ]);
</script>

<template>
  <div class="family-design family-design--people" :style="{ width: `${props.width}px` }">
    <CoarDayView :builder="builder">
      <template #event="{ event }">
        <div
          class="family-card family-people-card"
          :class="{ 'family-card--all': isEveryone(event) }"
          :style="cardStyle(event)"
        >
          <b>{{ titleOf(event) }}</b>
          <time>{{ clock(event) }}</time>
        </div>
      </template>
      <template #allDayEvent="{ event }">
        <div class="family-bar" :style="cardStyle(event)">{{ titleOf(event) }}</div>
      </template>
      <template #resourceHeader="{ resource }">
        <span class="family-person">
          <i :style="personStyle(resource?.id)">{{ resource?.label?.[0] }}</i>
          <template v-if="names">{{ resource?.label }}</template>
        </span>
      </template>
      <template #hourLabel="{ hour }">
        <span class="family-hour">{{ String(hour).padStart(2, '0') }}:00</span>
      </template>
      <template #overlay="{ overlay }">
        <div class="family-meal">{{ overlay.label }}</div>
      </template>
    </CoarDayView>
  </div>
</template>