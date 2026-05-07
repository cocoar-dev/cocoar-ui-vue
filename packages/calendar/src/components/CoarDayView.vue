<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarDayView>` — single-day calendar view.
 *
 * Thin wrapper around `<CoarTimeGrid>` with `dayCount = 1`. The
 * builder owns all config + handlers + the cursor (via `state.date`).
 *
 * Public surface: ONE prop, `:builder: CalendarBuilder`.
 */

import { computed, onMounted } from 'vue';
import CoarTimeGrid from './CoarTimeGrid.vue';
import { Temporal, type CalendarEvent, type PositionedEvent } from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { useViewWindow } from '../composables/useViewWindow';

interface Props {
  builder: CalendarBuilder<TMeta>;
}

const props = defineProps<Props>();

// Push the visible window through the builder so eventsLoader /
// onRangeChange / api.getVisibleRange() work in standalone usage.
useViewWindow(props.builder, { view: 'day' });

// Standalone usage: ensure builder.state.view reflects what we are
// (caller may have used `useDayView()` that doesn't set it).
// Mutating a property of the builder ref by design — `view` is a
// writable Ref the builder exposes specifically so `api.next/prev/setView`
// (and standalone sub-views) can pin it.
onMounted(() => {
  if (props.builder.state.view.value !== 'day') {
    // eslint-disable-next-line vue/no-mutating-props
    props.builder.state.view.value = 'day';
  }
});

defineSlots<{
  event(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  dayHeader(props: {
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
