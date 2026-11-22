<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarPagedMonthView>` — one month at a time, turned by swiping.
 *
 * The live `<CoarMonthView>` stays in flow and sets the height. While
 * a gesture runs, the previous and next month are mounted left and
 * right of it and move with the finger. They are visual only (`inert`,
 * `aria-hidden`). One `useViewWindow` with a month buffer loads all
 * three (C5), so a neighbour shows its events as soon as it appears.
 *
 * Rows never follow their content here: a grid that changed height
 * from month to month would jump on every page.
 */

import { computed, ref, toValue, useTemplateRef, watch } from 'vue';
import {
  Temporal,
  type CalendarEvent,
  type MonthCellPill,
  type MonthMultiDayBar,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { SET_TOPMOST_VISIBLE_MONTH } from '../builders/calendar-builder-internals';
import type { MonthDaySlotScope } from '../builders/types';
import { usePageSwipe } from '../composables/usePageSwipe';
import { useViewWindow } from '../composables/useViewWindow';
import { originatesFromEvent } from './internal/originatesFromEvent';
import CoarMonthView from './CoarMonthView.vue';

const props = defineProps<{ builder: CalendarBuilder<TMeta> }>();
defineSlots<{
  pill?(props: { event: CalendarEvent<TMeta>; pill: MonthCellPill<TMeta> }): unknown;
  multiDayBar?(props: { event: CalendarEvent<TMeta>; bar: MonthMultiDayBar<TMeta> }): unknown;
  dayNumber?(props: MonthDaySlotScope): unknown;
  dayContent?(props: MonthDaySlotScope): unknown;
}>();

useViewWindow(props.builder, { view: 'month', monthBuffer: 1 });

const root = useTemplateRef<HTMLElement>('root');
const month = computed(() => Temporal.PlainYearMonth.from(props.builder.state.date.value));
const rowSizing = computed(() =>
  toValue(props.builder.state.monthRowSizing) === 'fill' ? 'fill' : 'uniform',
);

// The shell's range label follows this month, also after a continuous view.
watch(month, (m) => props.builder[SET_TOPMOST_VISIBLE_MONTH](m), { immediate: true });

let turnedBySwipe = false;
const swipe = usePageSwipe({
  pageEl: root,
  enabled: () => toValue(props.builder.state.swipeNavigation),
  offsetVar: '--coar-paged-month-swipe-x',
  onCommit: (direction) => {
    turnedBySwipe = true;
    if (direction === 1) props.builder.api.next();
    else props.builder.api.prev();
  },
});

/** A page turn from the api slides in; a swipe has already moved the page. */
const entering = ref<'next' | 'prev' | null>(null);
watch(month, (next, previous) => {
  const bySwipe = turnedBySwipe;
  turnedBySwipe = false;
  if (bySwipe) return;
  const distance = previous.until(next, { largestUnit: 'months' }).months;
  entering.value = distance === 1 ? 'next' : distance === -1 ? 'prev' : null;
});

const pages = computed(() => {
  const live = { key: 'live', month: month.value, live: true };
  if (!swipe.engaged.value && !swipe.isSwiping.value && !swipe.settling.value) return [live];
  return [
    { key: 'prev', month: month.value.subtract({ months: 1 }), live: false },
    live,
    { key: 'next', month: month.value.add({ months: 1 }), live: false },
  ];
});

function onPointerdown(e: PointerEvent): void {
  // An event belongs to the drag runtime, the day sheet to its own list.
  if (originatesFromEvent(e)) return;
  if (e.target instanceof Element && e.target.closest('.coar-month-day-overlay')) return;
  swipe.onPointerdown(e);
}

defineExpose({
  /** Turn to the month of `date`. */
  scrollToDate: (date: Temporal.PlainDate) => props.builder.api.goTo(date),
});
</script>

<template>
  <div
    ref="root"
    class="coar-paged-month-view"
    :class="{
      'coar-paged-month-view--fill': rowSizing === 'fill',
      'coar-paged-month-view--settling': swipe.settling.value,
    }"
    :style="swipe.swipeStyle.value"
    @pointerdown="onPointerdown"
  >
    <div class="coar-paged-month-view__track">
      <div
        v-for="page in pages"
        :key="page.key"
        class="coar-paged-month-view__page"
        :class="[
          `coar-paged-month-view__page--${page.key}`,
          page.live && entering ? `coar-paged-month-view__page--enter-${entering}` : undefined,
        ]"
        :inert="!page.live"
        :aria-hidden="page.live ? undefined : 'true'"
        :data-month-key="page.month.toString()"
        @animationend="entering = null"
      >
        <CoarMonthView
          :builder="builder"
          :month="page.month"
          :manage-view-window="false"
          :row-sizing="rowSizing"
        >
          <template v-if="$slots.pill" #pill="slotProps">
            <slot name="pill" v-bind="slotProps" />
          </template>
          <template v-if="$slots.multiDayBar" #multiDayBar="slotProps">
            <slot name="multiDayBar" v-bind="slotProps" />
          </template>
          <template v-if="$slots.dayNumber" #dayNumber="slotProps">
            <slot name="dayNumber" v-bind="slotProps" />
          </template>
          <template v-if="$slots.dayContent" #dayContent="slotProps">
            <slot name="dayContent" v-bind="slotProps" />
          </template>
        </CoarMonthView>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-paged-month-view {
  position: relative;
  min-width: 0;
  /* Clip, not hidden: the weekday row stays sticky to the scroll surface
     and a day sheet may reach past the last row. */
  overflow-x: clip;
  touch-action: pan-y;
  background: var(--coar-calendar-bg, #fff);
}
.coar-paged-month-view--fill,
.coar-paged-month-view--fill .coar-paged-month-view__track,
.coar-paged-month-view--fill .coar-paged-month-view__page {
  height: 100%;
}
.coar-paged-month-view__track {
  position: relative;
  transform: translate3d(var(--coar-paged-month-swipe-x, 0px), 0, 0);
}
.coar-paged-month-view--settling .coar-paged-month-view__track {
  transition: transform 180ms ease-out;
}
.coar-paged-month-view__page--prev,
.coar-paged-month-view__page--next {
  position: absolute;
  top: 0;
  width: 100%;
  pointer-events: none;
}
.coar-paged-month-view__page--prev {
  left: -100%;
}
.coar-paged-month-view__page--next {
  left: 100%;
}
.coar-paged-month-view__page--enter-next {
  animation: coar-paged-month-enter-next 180ms ease-out;
}
.coar-paged-month-view__page--enter-prev {
  animation: coar-paged-month-enter-prev 180ms ease-out;
}
@keyframes coar-paged-month-enter-next {
  from {
    transform: translate3d(100%, 0, 0);
  }
}
@keyframes coar-paged-month-enter-prev {
  from {
    transform: translate3d(-100%, 0, 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .coar-paged-month-view--settling .coar-paged-month-view__track {
    transition: none;
  }
  .coar-paged-month-view__page--enter-next,
  .coar-paged-month-view__page--enter-prev {
    animation: none;
  }
}
</style>
