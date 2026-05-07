<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarWeekView>` — 7-day calendar view.
 *
 * Thin wrapper around `<CoarTimeGrid>`: resolves the builder's
 * cursor to 7 dates via `weekDates(cursor, fdow)` (with locale-
 * default fallback for fdow when the builder hasn't set it).
 *
 * Public surface: ONE prop, `:builder: CalendarBuilder`.
 */

import { computed, onMounted, toValue } from 'vue';
import { useLocalization } from '@cocoar/vue-localization';
import CoarTimeGrid from './CoarTimeGrid.vue';
import {
  Temporal,
  weekDates,
  detectFirstDayOfWeekFromLocale,
  type CalendarEvent,
  type PositionedEvent,
  type AllDayBar,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { useViewWindow } from '../composables/useViewWindow';

interface Props {
  builder: CalendarBuilder<TMeta>;
}

const props = defineProps<Props>();

// Push the visible window through the builder so loaders /
// onRangeChange / api.getVisibleRange() work standalone.
useViewWindow(props.builder, { view: 'week' });

onMounted(() => {
  if (props.builder.state.view.value !== 'week') {
    props.builder.state.view.value = 'week';
  }
});

defineSlots<{
  event(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  allDayEvent(props: { event: CalendarEvent<TMeta>; layout: AllDayBar<TMeta> }): unknown;
  dayHeader(props: {
    date: Temporal.PlainDate;
    isToday: boolean;
    isWeekend: boolean;
  }): unknown;
}>();

const localization = useLocalization();
const effectiveLocale = computed<string>(
  () => toValue(props.builder.state.locale) ?? localization?.language.value ?? 'en-US',
);
const effectiveFirstDayOfWeek = computed(
  () =>
    toValue(props.builder.state.firstDayOfWeek) ??
    detectFirstDayOfWeekFromLocale(effectiveLocale.value),
);

const days = computed<Temporal.PlainDate[]>(() =>
  weekDates(
    props.builder.state.date.value,
    effectiveFirstDayOfWeek.value,
  ),
);

defineExpose({
  /** First and last visible date (inclusive). */
  getVisibleRange(): { start: Temporal.PlainDate; end: Temporal.PlainDate } {
    const ds = days.value;
    return { start: ds[0], end: ds[ds.length - 1] };
  },
});
</script>

<template>
  <div class="coar-week-view">
    <CoarTimeGrid :builder="builder" :dates="days">
      <template v-if="$slots.event" #event="slotProps">
        <slot name="event" v-bind="slotProps" />
      </template>
      <template v-if="$slots.allDayEvent" #allDayEvent="slotProps">
        <slot name="allDayEvent" v-bind="slotProps" />
      </template>
      <template v-if="$slots.dayHeader" #dayHeader="slotProps">
        <slot name="dayHeader" v-bind="slotProps" />
      </template>
    </CoarTimeGrid>
  </div>
</template>

<style scoped>
.coar-week-view {
  display: block;
  width: 100%;
}
</style>
