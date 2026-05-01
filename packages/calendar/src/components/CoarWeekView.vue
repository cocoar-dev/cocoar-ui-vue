<script setup lang="ts">
/**
 * `<CoarWeekView>` — 7-day calendar view.
 *
 * Per design doc §6.2, this is the day view × 7 plus the all-day
 * band. The TimeGrid component handles both layers natively (it
 * accepts an arbitrary `days` array and renders the all-day band
 * automatically when there are matching events). WeekView is a
 * thin wrapper that:
 *
 *   - Resolves the cursor to 7 dates via `weekDates(cursor, fdow)`
 *   - Forwards events / config to `<CoarTimeGrid>`
 *   - Re-emits all events upward
 *   - Exposes an imperative `scrollToTime`
 */

import { computed, useTemplateRef } from 'vue';
import CoarTimeGrid from './CoarTimeGrid.vue';
import type {
  CalendarEvent,
  PositionedEvent,
  AllDayBar,
  DayOfWeek,
} from '../core';
import { Temporal, weekDates } from '../core';

interface Props {
  /** ISO date string for any date inside the week to render. */
  cursor: string;
  events: ReadonlyArray<CalendarEvent>;
  /** 0 = Sun … 6 = Sat. */
  firstDayOfWeek?: DayOfWeek;
  timeRange?: [number, number];
  slotDuration?: 5 | 10 | 15 | 30 | 60;
  pixelsPerHour?: number;
  timezone?: string;
  locale?: string;
  density?: 'comfortable' | 'compact';
}

const props = withDefaults(defineProps<Props>(), {
  firstDayOfWeek: 1,
  timeRange: () => [0, 24],
  slotDuration: 30,
  pixelsPerHour: 60,
  timezone: 'UTC',
  locale: 'en-US',
  density: 'comfortable',
});

defineSlots<{
  event(props: { event: CalendarEvent; layout: PositionedEvent }): unknown;
  allDayEvent(props: { event: CalendarEvent; layout: AllDayBar }): unknown;
  dayHeader(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();

const emit = defineEmits<{
  'time-click': [{ date: Temporal.PlainDate; time: Temporal.PlainTime; native: PointerEvent }];
  'date-click': [{ date: Temporal.PlainDate; native: PointerEvent }];
  'event-click': [{ event: CalendarEvent; native: PointerEvent }];
  'event-drop': [{
    event: CalendarEvent;
    original: { start: string; end?: string };
    next: { start: string; end?: string };
    target: { date: string; minutes: number };
    native: PointerEvent | null;
  }];
}>();

const days = computed<Temporal.PlainDate[]>(() =>
  weekDates(Temporal.PlainDate.from(props.cursor), props.firstDayOfWeek),
);

const gridRef = useTemplateRef<InstanceType<typeof CoarTimeGrid>>('grid');

defineExpose({
  /** Scroll the grid container so the given hour is at the top. */
  scrollToTime(hour: number): void {
    const container = (gridRef.value as unknown as { $el?: HTMLElement } | null)?.$el;
    if (!container) return;
    const px = (hour - props.timeRange[0]) * props.pixelsPerHour;
    container.scrollTop = Math.max(0, px);
  },
  /** First and last visible date (inclusive). */
  getVisibleRange(): { start: Temporal.PlainDate; end: Temporal.PlainDate } {
    const ds = days.value;
    return { start: ds[0], end: ds[ds.length - 1] };
  },
});
</script>

<template>
  <div class="coar-week-view">
    <CoarTimeGrid
      ref="grid"
      :days="days"
      :events="events"
      :time-range="timeRange"
      :slot-duration="slotDuration"
      :pixels-per-hour="pixelsPerHour"
      :timezone="timezone"
      :locale="locale"
      :density="density"
      @time-click="emit('time-click', $event)"
      @date-click="emit('date-click', $event)"
      @event-click="emit('event-click', $event)"
      @event-drop="emit('event-drop', $event)"
    >
      <template #event="slotProps">
        <slot name="event" v-bind="slotProps" />
      </template>
      <template #allDayEvent="slotProps">
        <slot name="allDayEvent" v-bind="slotProps" />
      </template>
      <template #dayHeader="slotProps">
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
