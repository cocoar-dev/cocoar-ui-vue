<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarWeekView>` — 7-day calendar view.
 *
 * A preset of `<CoarTimeGridSurface>` (`view: 'week'`): anchored at
 * the locale's first day of the week, seven columns, pages by seven
 * days. Day and Work week are presets of the same surface.
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
  /** First and last visible date (inclusive). */
  getVisibleRange(): { start: Temporal.PlainDate; end: Temporal.PlainDate } {
    // A week always renders seven columns — the surface cannot be empty here.
    return surface.value!.getVisibleRange()!;
  },
});
</script>

<template>
  <CoarTimeGridSurface ref="surface" class="coar-week-view" :builder="builder" view="week">
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
