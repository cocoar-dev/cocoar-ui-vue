<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarWorkWeekView>` — working-days subset of the week view.
 *
 * A preset of `<CoarTimeGridSurface>` (`view: 'workWeek'`): anchored
 * at the locale's first day of the week, a seven-day window filtered
 * to `builder.workDays(...)` (default Mon–Fri), pages by seven days.
 * Loaders still see the full Mon–Sun window — only the rendered
 * columns differ from `<CoarWeekView>`.
 *
 * Public surface: ONE prop, `:builder: CalendarBuilder`.
 */

import { useTemplateRef } from 'vue';
import CoarTimeGridSurface from './internal/time-grid/CoarTimeGridSurface.vue';
import type { Temporal, CalendarEvent, PositionedEvent, AllDayBar } from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import type { CalendarDraftSegment } from '../builders/types';

defineProps<{ builder: CalendarBuilder<TMeta> }>();

defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  allDayEvent?(props: { event: CalendarEvent<TMeta>; layout: AllDayBar<TMeta> }): unknown;
  dayHeader?(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
  /** The host's draft (`builder.draft`), drawn yourself — one call per day it covers. */
  draft?(props: {
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
    segment: CalendarDraftSegment;
  }): unknown;
}>();

/** What the surface exposes — typed by hand because the surface is a generic component. */
type SurfaceExposed = {
  getVisibleRange(): { start: Temporal.PlainDate; end: Temporal.PlainDate } | null;
};
const surface = useTemplateRef<SurfaceExposed>('surface');

defineExpose({
  /** First and last visible date (inclusive). `null` when `workDays` is empty. */
  getVisibleRange(): { start: Temporal.PlainDate; end: Temporal.PlainDate } | null {
    return surface.value?.getVisibleRange() ?? null;
  },
});
</script>

<template>
  <CoarTimeGridSurface ref="surface" class="coar-work-week-view" :builder="builder" view="workWeek">
    <template v-if="$slots.event" #event="slotProps">
      <slot name="event" v-bind="slotProps" />
    </template>
    <template v-if="$slots.allDayEvent" #allDayEvent="slotProps">
      <slot name="allDayEvent" v-bind="slotProps" />
    </template>
    <template v-if="$slots.dayHeader" #dayHeader="slotProps">
      <slot name="dayHeader" v-bind="slotProps" />
    </template>
    <template v-if="$slots.draft" #draft="slotProps">
      <slot name="draft" v-bind="slotProps" />
    </template>
  </CoarTimeGridSurface>
</template>
