<script setup lang="ts">
/**
 * `<CoarDayView>` — single-day calendar view.
 *
 * Per design doc §6.3, this is the simplest view: a `CoarTimeGrid`
 * with `dayCount = 1`. Wider event cards because the column gets
 * the full available width.
 *
 * The wrapper handles:
 *   - Cursor → days array (`[cursor]`)
 *   - Re-emitting events from `CoarTimeGrid` upward
 *   - Imperative API (`scrollToTime`)
 *
 * Slots and styling are passed straight through to `CoarTimeGrid`.
 */

import { computed, useTemplateRef } from 'vue';
import CoarTimeGrid from './CoarTimeGrid.vue';
import type { CalendarEvent, PositionedEvent } from '../core';
import { Temporal } from '../core';

interface Props {
  /** ISO date string for the day to render, e.g. `'2026-04-15'`. */
  cursor: string;
  events: ReadonlyArray<CalendarEvent>;
  timeRange?: [number, number];
  slotDuration?: 5 | 10 | 15 | 30 | 60;
  pixelsPerHour?: number;
  timezone?: string;
  locale?: string;
  density?: 'comfortable' | 'compact';
}

const props = withDefaults(defineProps<Props>(), {
  timeRange: () => [0, 24],
  slotDuration: 30,
  pixelsPerHour: 60,
  timezone: 'UTC',
  locale: 'en-US',
  density: 'comfortable',
});

defineSlots<{
  event(props: { event: CalendarEvent; layout: PositionedEvent }): unknown;
  dayHeader(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();

const emit = defineEmits<{
  'time-click': [{ date: Temporal.PlainDate; time: Temporal.PlainTime; native: PointerEvent }];
  'event-click': [{ event: CalendarEvent; native: PointerEvent }];
}>();

const days = computed<Temporal.PlainDate[]>(() => [
  Temporal.PlainDate.from(props.cursor),
]);

const gridRef = useTemplateRef<InstanceType<typeof CoarTimeGrid>>('grid');

defineExpose({
  /** Scroll the grid container so the given hour is at the top. */
  scrollToTime(hour: number): void {
    const container = (gridRef.value as unknown as { $el?: HTMLElement } | null)?.$el;
    if (!container) return;
    const px = (hour - props.timeRange[0]) * props.pixelsPerHour;
    container.scrollTop = Math.max(0, px);
  },
});
</script>

<template>
  <div class="coar-day-view">
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
      @event-click="emit('event-click', $event)"
    >
      <template #event="slotProps">
        <slot name="event" v-bind="slotProps" />
      </template>
      <template #dayHeader="slotProps">
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
