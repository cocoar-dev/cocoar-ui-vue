<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarDayView>` — one-day or width-driven multi-day calendar view.
 *
 * Thin wrapper around `<CoarTimeGrid>`. Single mode renders one day;
 * multi-day derives up to seven full columns from the available width.
 * The builder owns all config + handlers + the cursor (via `state.date`).
 *
 * Public surface: ONE prop, `:builder: CalendarBuilder`.
 */

import { computed, onBeforeUnmount, onMounted, ref, toValue, useTemplateRef } from 'vue';
import CoarTimeGrid from './CoarTimeGrid.vue';
import { Temporal, type CalendarEvent, type PositionedEvent } from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { useViewWindow } from '../composables/useViewWindow';
import { responsiveDayColumnCount } from '../core/dayColumns';

// Inlined defineProps argument to avoid vue-tsc TS4025 — see note in
// CoarMonthView.vue.
const props = defineProps<{ builder: CalendarBuilder<TMeta> }>();

defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  dayHeader?(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();

const root = useTemplateRef<HTMLElement>('root');
const availableWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;
const dayCount = computed(() => {
  if (toValue(props.builder.state.dayMode) === 'single') return 1;
  // Web deliberately omits iOS's clipped peek column: on a wide desktop every derived column is
  // fully usable, but the same width-driven principle decides how many fit, capped at one week.
  return responsiveDayColumnCount(
    availableWidth.value,
    toValue(props.builder.state.dayColumnCount),
    toValue(props.builder.state.dayColumnMinWidth),
    64,
    7,
  );
});

// The resolved, width-driven count is part of both the loader window and page navigation.
useViewWindow(props.builder, { view: 'day', dayColumnCount: dayCount });

const days = computed<Temporal.PlainDate[]>(() =>
  Array.from({ length: dayCount.value }, (_, index) =>
    props.builder.state.date.value.add({ days: index }),
  ),
);

onMounted(() => {
  if (!root.value || typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(([entry]) => {
    availableWidth.value = entry.contentRect.width;
  });
  resizeObserver.observe(root.value);
  availableWidth.value = root.value.getBoundingClientRect().width;
});
onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<template>
  <div ref="root" class="coar-day-view" :data-day-count="dayCount">
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
