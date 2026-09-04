<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarTimeGridSurface>` — the ONE host behind `<CoarDayView>`,
 * `<CoarWeekView>` and `<CoarWorkWeekView>`.
 *
 * Resolves the builder's cursor to the rendered column dates through
 * `resolveTimeGridRange` (core), measures the container for the
 * responsive span, publishes the loader window via `useViewWindow`
 * and renders `<CoarTimeGrid>`. The three public views are presets
 * that pick a `view` and a root class; everything else — swipe,
 * hooks, all-day cap, slots — lives here exactly once.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed, onBeforeUnmount, onMounted, ref, toValue, useTemplateRef } from 'vue';
import { useLocalization } from '@cocoar/vue-localization';
import CoarTimeGrid from '../../CoarTimeGrid.vue';
import {
  Temporal,
  detectFirstDayOfWeekFromLocale,
  resolveTimeGridRange,
  responsiveDayColumnCount,
  timeGridRangeSpecFor,
  type AllDayBar,
  type CalendarEvent,
  type PositionedEvent,
  type TimeGridView,
} from '../../../core';
import { CalendarBuilder } from '../../../builders/calendar-builder';
import { useViewWindow } from '../../../composables/useViewWindow';

const props = defineProps<{ builder: CalendarBuilder<TMeta>; view: TimeGridView }>();

defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  allDayEvent?(props: { event: CalendarEvent<TMeta>; layout: AllDayBar<TMeta> }): unknown;
  dayHeader?(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();

const localization = useLocalization();
const locale = computed<string>(
  () => toValue(props.builder.state.locale) ?? localization?.language.value ?? 'en-US',
);
const firstDayOfWeek = computed(
  () => toValue(props.builder.state.firstDayOfWeek) ?? detectFirstDayOfWeekFromLocale(locale.value),
);

const spec = computed(() =>
  timeGridRangeSpecFor(props.view, {
    dayMode: toValue(props.builder.state.dayMode),
    explicit: toValue(props.builder.state.timeGridRange),
  }),
);

// Container width → responsive column count. Web deliberately omits
// iOS's clipped peek column: every derived column is fully usable,
// capped at one week.
const root = useTemplateRef<HTMLElement>('root');
const availableWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;
const responsiveColumns = computed(() =>
  responsiveDayColumnCount(
    availableWidth.value,
    toValue(props.builder.state.dayColumnCount),
    toValue(props.builder.state.dayColumnMinWidth),
    64,
    7,
  ),
);

const range = computed(() =>
  resolveTimeGridRange({
    spec: spec.value,
    cursor: props.builder.state.date.value,
    firstDayOfWeek: firstDayOfWeek.value,
    workDays: toValue(props.builder.state.workDays),
    responsiveColumns: responsiveColumns.value,
  }),
);
const days = computed<Temporal.PlainDate[]>(() => range.value.days);

// The resolved spec + span feed the loader window and page navigation
// (`useViewWindow` → `computeViewWindow` uses the same resolver).
useViewWindow(props.builder, {
  view: props.view,
  timeGridRange: spec,
  dayColumnCount: () => range.value.spanDays,
});

onMounted(() => {
  if (!root.value || typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(([entry]) => {
    availableWidth.value = entry.contentRect.width;
  });
  resizeObserver.observe(root.value);
  availableWidth.value = root.value.getBoundingClientRect().width;
});
onBeforeUnmount(() => resizeObserver?.disconnect());

defineExpose({
  /** First and last rendered date (inclusive); `null` when nothing renders. */
  getVisibleRange(): { start: Temporal.PlainDate; end: Temporal.PlainDate } | null {
    const ds = days.value;
    if (ds.length === 0) return null;
    return { start: ds[0], end: ds[ds.length - 1] };
  },
});
</script>

<template>
  <div ref="root" class="coar-time-grid-surface" :data-day-count="days.length">
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
.coar-time-grid-surface {
  display: block;
  width: 100%;
}
</style>
