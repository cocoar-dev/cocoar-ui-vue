<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarWorkWeekView>` — working-days subset of the week view.
 *
 * Thin wrapper around `<CoarTimeGrid>`: resolves the builder's
 * cursor to the active week, then filters down to the
 * `builder.workDays(...)` set (default Mon–Fri). The visible-range
 * window itself stays Mon–Sun (loaders see weekend events too —
 * see `viewWindow.ts`); only the rendered columns differ from
 * `<CoarWeekView>`.
 *
 * Public surface: ONE prop, `:builder: CalendarBuilder`.
 */

import { computed, toValue } from 'vue';
import { useLocalization } from '@cocoar/vue-localization';
import CoarTimeGrid from './CoarTimeGrid.vue';
import {
  Temporal,
  workWeekDates,
  detectFirstDayOfWeekFromLocale,
  type CalendarEvent,
  type PositionedEvent,
  type AllDayBar,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { useViewWindow } from '../composables/useViewWindow';

const props = defineProps<{ builder: CalendarBuilder<TMeta> }>();

useViewWindow(props.builder, { view: 'workWeek' });

defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  allDayEvent?(props: { event: CalendarEvent<TMeta>; layout: AllDayBar<TMeta> }): unknown;
  dayHeader?(props: {
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
const effectiveWorkDays = computed(() => toValue(props.builder.state.workDays));

const days = computed<Temporal.PlainDate[]>(() =>
  workWeekDates(
    props.builder.state.date.value,
    effectiveFirstDayOfWeek.value,
    effectiveWorkDays.value,
  ),
);

defineExpose({
  /** First and last visible date (inclusive). Empty when
   *  `workDays` is empty. */
  getVisibleRange(): { start: Temporal.PlainDate; end: Temporal.PlainDate } | null {
    const ds = days.value;
    if (ds.length === 0) return null;
    return { start: ds[0], end: ds[ds.length - 1] };
  },
});
</script>

<template>
  <div class="coar-work-week-view">
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
.coar-work-week-view {
  display: block;
  width: 100%;
}
</style>
