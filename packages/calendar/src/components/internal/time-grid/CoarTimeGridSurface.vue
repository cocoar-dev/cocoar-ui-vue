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
 * **Neighbour pages.** While the grid is being swiped, the previous
 * and next page (cursor ∓ / ± the spec's step) are mounted as ghost
 * grids left and right of the live one, sharing its translate, so
 * the gesture reads as paging between two visible pages. The ghosts
 * are visual only (`aria-hidden`, no pointer events) and read their
 * events through `api.getEventsForWindow`; the builder pre-warms
 * those windows (`prefetchNeighbours`) so they carry their events.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed, onBeforeUnmount, onMounted, ref, toValue, useTemplateRef, watch } from 'vue';
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
  type TimeGridRange,
  type TimeGridView,
  type ViewWindow,
} from '../../../core';
import { CalendarBuilder } from '../../../builders/calendar-builder';
import { PREFETCH_WINDOWS } from '../../../builders/calendar-builder-internals';
import { useViewWindow } from '../../../composables/useViewWindow';
import type { TimeGridSwipeState } from '../../../composables/useTimeGridSwipe';

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

function rangeAt(cursor: Temporal.PlainDate): TimeGridRange {
  return resolveTimeGridRange({
    spec: spec.value,
    cursor,
    firstDayOfWeek: firstDayOfWeek.value,
    workDays: toValue(props.builder.state.workDays),
    responsiveColumns: responsiveColumns.value,
  });
}
const range = computed(() => rangeAt(props.builder.state.date.value));
const days = computed<Temporal.PlainDate[]>(() => range.value.days);

// The resolved spec + span feed the loader window and page navigation
// (`useViewWindow` → `computeViewWindow` uses the same resolver).
useViewWindow(props.builder, {
  view: props.view,
  timeGridRange: spec,
  dayColumnCount: () => range.value.spanDays,
});

// ─── Neighbour pages ─────────────────────────────────────────────

const swipeState = ref<TimeGridSwipeState>({
  engaged: false,
  swiping: false,
  settling: false,
  offsetX: '0px',
});
const showNeighbours = computed(
  () => swipeState.value.engaged || swipeState.value.swiping || swipeState.value.settling,
);
/**
 * Heights of the live grid's sticky top (header + all-day band) and
 * of its all-day band alone, measured when a gesture starts. The
 * ghosts pin theirs to them so the hour rows of all three pages line
 * up while they move together — an empty band of the same height
 * when the ghost page has no all-day events.
 */
const liveTopPx = ref(0);
const liveBandPx = ref(0);
watch(showNeighbours, (on) => {
  if (!on) return;
  const live = ':scope > .coar-time-grid:not(.coar-time-grid--ghost)';
  const find = (selector: string) =>
    root.value?.querySelector<HTMLElement>(`${live} ${selector}`) ?? null;
  const top = find('.coar-time-grid__sticky-top');
  liveTopPx.value = top ? Math.round(top.getBoundingClientRect().height) : 0;
  // `clientHeight`: the band's `min-height` excludes its bottom border.
  liveBandPx.value = find('.coar-time-grid-all-day-band')?.clientHeight ?? 0;
});

/** The page one step before / after the live one — same resolver, cursor ∓/± step. */
const prevRange = computed(() =>
  rangeAt(props.builder.state.date.value.subtract({ days: range.value.stepDays })),
);
const nextRange = computed(() =>
  rangeAt(props.builder.state.date.value.add({ days: range.value.stepDays })),
);
function windowFor(r: TimeGridRange): ViewWindow {
  // Identical to what `computeViewWindow` produces for these views:
  // the unfiltered span in the display zone.
  return {
    view: props.view,
    start: r.start.toString(),
    end: r.start.add({ days: r.spanDays }).toString(),
    timezone: toValue(props.builder.state.timezone),
  };
}
const prevWindow = computed(() => windowFor(prevRange.value));
const nextWindow = computed(() => windowFor(nextRange.value));

// Warm the neighbour windows shortly after the live window settled,
// so a quick run of next-next-next doesn't fan out fetches for pages
// that were never shown.
const PREFETCH_DELAY_MS = 200;
let prefetchTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => ({
    on:
      toValue(props.builder.state.prefetchNeighbours) &&
      toValue(props.builder.state.swipeNavigation),
    windows: [prevWindow.value, nextWindow.value],
  }),
  ({ on, windows }) => {
    if (prefetchTimer) clearTimeout(prefetchTimer);
    if (!on) return;
    prefetchTimer = setTimeout(() => {
      prefetchTimer = null;
      props.builder[PREFETCH_WINDOWS](windows);
    }, PREFETCH_DELAY_MS);
  },
  { immediate: true, flush: 'post' },
);

onMounted(() => {
  if (!root.value || typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(([entry]) => {
    availableWidth.value = entry.contentRect.width;
  });
  resizeObserver.observe(root.value);
  availableWidth.value = root.value.getBoundingClientRect().width;
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (prefetchTimer) clearTimeout(prefetchTimer);
});

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
  <div
    ref="root"
    class="coar-time-grid-surface"
    :class="{
      'coar-time-grid--settling': swipeState.settling,
      'coar-time-grid--swiping': swipeState.swiping,
    }"
    :style="{ '--coar-time-grid-swipe-x': swipeState.offsetX }"
    :data-day-count="days.length"
  >
    <CoarTimeGrid
      v-if="showNeighbours"
      ghost
      class="coar-time-grid-surface__ghost coar-time-grid-surface__ghost--prev"
      :builder="builder"
      :dates="prevRange.days"
      :window="prevWindow"
      :ghost-top-px="liveTopPx"
      :ghost-band-px="liveBandPx"
    >
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

    <CoarTimeGrid :builder="builder" :dates="days" @swipe-state="swipeState = $event">
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

    <CoarTimeGrid
      v-if="showNeighbours"
      ghost
      class="coar-time-grid-surface__ghost coar-time-grid-surface__ghost--next"
      :builder="builder"
      :dates="nextRange.days"
      :window="nextWindow"
      :ghost-top-px="liveTopPx"
      :ghost-band-px="liveBandPx"
    >
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
  position: relative;
  /* Neighbour pages sit outside the surface until the pan brings
     them in; never widen the scroll surface. */
  overflow-x: clip;
}
/* A ghost is a full grid placed one page to the side, its (hidden)
   hour axis keeping the width so its columns line up with ours:
   columns start at `axis`, one page is `100% - axis` wide. */
.coar-time-grid-surface__ghost {
  position: absolute;
  top: 0;
  width: 100%;
}
.coar-time-grid-surface__ghost--prev {
  left: calc(-1 * (100% - var(--coar-time-grid-axis-width, 80px)));
}
.coar-time-grid-surface__ghost--next {
  left: calc(100% - var(--coar-time-grid-axis-width, 80px));
}
</style>
