<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarDayView>` — single-day calendar view.
 *
 * Thin wrapper around `<CoarTimeGrid>` with `dayCount = 1`. The
 * builder owns all config + handlers + the cursor (via `state.date`).
 *
 * Public surface: ONE prop, `:builder: CalendarBuilder`.
 */

import { computed } from 'vue';
import CoarTimeGrid from './CoarTimeGrid.vue';
import { Temporal, type CalendarEvent, type PositionedEvent } from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { useViewWindow } from '../composables/useViewWindow';

// Inlined defineProps argument to avoid vue-tsc TS4025 — see note in
// CoarMonthView.vue.
const props = defineProps<{ builder: CalendarBuilder<TMeta> }>();

// Push the visible window through the builder so eventsLoader /
// onRangeChange / api.getVisibleRange() work in standalone usage.
// `view: 'day'` also pins builder.state.view so a builder composed via
// `useDayView()` (which does not set the view) renders correctly here.
useViewWindow(props.builder, { view: 'day' });

defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  dayHeader?(props: {
    date: Temporal.PlainDate;
    isToday: boolean;
    isWeekend: boolean;
  }): unknown;
}>();

const days = computed<Temporal.PlainDate[]>(() => [
  props.builder.state.date.value,
]);
</script>

<template>
  <div class="coar-day-view">
    <CoarTimeGrid :builder="builder" :dates="days">
      <template v-if="$slots.event" #event="slotProps">
        <slot name="event" v-bind="slotProps" />
      </template>
      <template v-if="$slots.dayHeader" #dayHeader="slotProps">
        <slot name="dayHeader" v-bind="slotProps" />
      </template>
    </CoarTimeGrid>
  </div>
</template>

<style scoped>
.coar-day-view {
  display: block;
  width: 100%;
}
</style>
