<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarDayView>` — one-day or width-driven multi-day calendar view.
 *
 * A preset of `<CoarTimeGridSurface>` (`view: 'day'`): one column in
 * `dayMode('single')`, as many complete columns as fit in
 * `dayMode('multiDay')`, or exactly what `builder.timeGridRange(...)`
 * describes. Week and Work week are presets of the same surface, so
 * every grid feature behaves identically across the three.
 *
 * Public surface: ONE prop, `:builder: CalendarBuilder`.
 */

import { useTemplateRef } from 'vue';
import CoarTimeGridSurface from './internal/time-grid/CoarTimeGridSurface.vue';
import type { Temporal, CalendarEvent, PositionedEvent, AllDayBar } from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';

defineProps<{ builder: CalendarBuilder<TMeta> }>();

defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  allDayEvent?(props: { event: CalendarEvent<TMeta>; layout: AllDayBar<TMeta> }): unknown;
  dayHeader?(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();

/** What the surface exposes — typed by hand because the surface is a generic component. */
type SurfaceExposed = {
  getVisibleRange(): { start: Temporal.PlainDate; end: Temporal.PlainDate } | null;
};
const surface = useTemplateRef<SurfaceExposed>('surface');

defineExpose({
  /** First and last rendered date (inclusive). */
  getVisibleRange(): { start: Temporal.PlainDate; end: Temporal.PlainDate } | null {
    return surface.value?.getVisibleRange() ?? null;
  },
});
</script>

<template>
  <CoarTimeGridSurface ref="surface" class="coar-day-view" :builder="builder" view="day">
    <template v-if="$slots.event" #event="slotProps">
      <slot name="event" v-bind="slotProps" />
    </template>
    <template v-if="$slots.allDayEvent" #allDayEvent="slotProps">
      <slot name="allDayEvent" v-bind="slotProps" />
    </template>
    <template v-if="$slots.dayHeader" #dayHeader="slotProps">
      <slot name="dayHeader" v-bind="slotProps" />
    </template>
  </CoarTimeGridSurface>
</template>
