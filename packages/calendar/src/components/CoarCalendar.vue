<script setup lang="ts">
/**
 * `<CoarCalendar>` — top-level shell, builder-driven (Phase 6).
 *
 * Single `:builder` prop. All configuration and event registration
 * goes through `CoarCalendarBuilder` (`useCalendar()`). Reading from
 * the builder's `state` computed keeps this template a thin
 * pass-through to the four sub-views (Day, Week, Month, Agenda),
 * which keep their prop-based API for now — the migration story
 * stops at the shell layer.
 *
 * What we expose:
 *   - 7 template slots (header / headerStart / headerEnd /
 *     viewSwitcher / event / allDayEvent / dayHeader). When a slot
 *     is provided it overrides any builder-level renderer (Phase
 *     6.4 wires the renderer fallback). For now slots remain the
 *     consumer's primary customisation surface.
 *   - No emits — handlers register on the builder. The component
 *     forwards sub-view events directly into the builder's
 *     package-private `_emit*` channels.
 *   - No imperative `defineExpose` — everything goes through
 *     `builder.api`. The shell registers `scrollToTime` /
 *     `scrollToDate` delegates with the builder so those api
 *     methods reach the active sub-view.
 *
 * Sub-views still take individual props (events, timezone, locale,
 * etc.) — refactoring them to also consume the builder is a future
 * cleanup; the shell's job is to translate `builder.state.value.*`
 * into those props.
 */

import { computed, onBeforeUnmount, onMounted, toValue, useTemplateRef } from 'vue';
import { useI18n, useLocalization } from '@cocoar/vue-localization';
import { CoarButton, CoarSegmentedControl } from '@cocoar/vue-ui';
import CoarDayView from './CoarDayView.vue';
import CoarWeekView from './CoarWeekView.vue';
import CoarWorkWeekView from './CoarWorkWeekView.vue';
import CoarMonthView from './CoarMonthView.vue';
import CoarAgendaView from './CoarAgendaView.vue';
import {
  Temporal,
  computeViewWindow,
  detectFirstDayOfWeekFromLocale,
  buildFormatOptions,
  type CalendarEvent,
  type CalendarView,
  type MonthCellPill,
  type MonthMultiDayBar,
  type AllDayBar,
  type PositionedEvent,
  type ViewWindow,
  type AgendaEventItem,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';

interface Props {
  builder: CalendarBuilder<Record<string, unknown>>;
}
const props = defineProps<Props>();

defineSlots<{
  /** Replace the entire header bar. Overrides headerStart/End/viewSwitcher. */
  header?(props: HeaderSlotScope): unknown;
  /** Prepend before the prev/today/next buttons. */
  headerStart?(props: { controls: HeaderControls }): unknown;
  /** Append after the view-switcher. */
  headerEnd?(props: { controls: HeaderControls }): unknown;
  /** Replace just the view-switcher. */
  viewSwitcher?(props: {
    view: CalendarView;
    available: ReadonlyArray<CalendarView>;
    setView: (v: CalendarView) => void;
  }): unknown;
  /** Per-event renderer — forwarded to whichever view is active.
   *  This is the universal event slot; on month view it falls back
   *  to `pill` / `multiDayBar` for cell entries that have a more-
   *  specific renderer. */
  event?(props: {
    event: CalendarEvent;
    view: CalendarView;
    layout?: PositionedEvent | AllDayBar | MonthCellPill | MonthMultiDayBar;
    item?: AgendaEventItem;
  }): unknown;
  /** All-day-band renderer (week / day). Falls back to `event` if
   *  not provided. */
  allDayEvent?(props: { event: CalendarEvent; layout: AllDayBar }): unknown;
  /** Single-day month-cell pill renderer. Falls back to `event` if
   *  not provided. */
  pill?(props: { event: CalendarEvent; pill: MonthCellPill }): unknown;
  /** Multi-day month-cell bar renderer. Falls back to `event` if not
   *  provided. */
  multiDayBar?(props: { event: CalendarEvent; bar: MonthMultiDayBar }): unknown;
  /** Per-day-column header (week / month). */
  dayHeader?(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();

interface HeaderSlotScope {
  view: CalendarView;
  cursor: Temporal.PlainDate;
  range: ViewWindow;
  controls: HeaderControls;
}
interface HeaderControls {
  prev: () => void;
  next: () => void;
  goToToday: () => void;
  setView: (v: CalendarView) => void;
  rangeLabel: string;
  view: CalendarView;
  available: ReadonlyArray<CalendarView>;
}

// ─── State surface from the builder ──────────────────────────────
//
// `builder.state` holds raw `MaybeRefOrGetter` fields. Build a snapshot
// adapter computed that resolves every field through `toValue` per
// Vue's reactivity tick — keeps the template idiom `state.value.X`
// while preserving the C7 read-on-every-call contract.
const state = computed(() => {
  const s = props.builder.state;
  // `timeRange` is stored as `{ startMinutes, endMinutes }`. Surface
  // both the object (for time-grid math) AND an `[startHour, endHour]`
  // hour tuple (for the older grid renderer paths that still expect
  // hours) so the template doesn't have to convert at every site.
  const tr = toValue(s.timeRange);
  const trTuple: readonly [number, number] = [
    Math.floor(tr.startMinutes / 60),
    Math.ceil(tr.endMinutes / 60),
  ];
  return {
    locale: toValue(s.locale),
    timezone: toValue(s.timezone),
    firstDayOfWeek: toValue(s.firstDayOfWeek),
    density: toValue(s.density),
    dateStyle: toValue(s.dateStyle),
    timeStyle: toValue(s.timeStyle),
    hour12: toValue(s.hour12),
    availableViews: toValue(s.availableViews),
    timeRange: trTuple,
    timeRangeMinutes: tr,
    slotDuration: toValue(s.slotDuration),
    pixelsPerHour: toValue(s.pixelsPerHour),
    agendaLengthDays: toValue(s.agendaLengthDays),
    showEmptyDays: toValue(s.showEmptyDays),
    maxEventsPerCell: toValue(s.maxEventsPerCell),
    dstPolicy: toValue(s.dstPolicy),
    canDrop: s.canDrop,
    // Renderers are stored as-is (Component | function) — not MaybeRefOrGetter.
    // Calling toValue on a renderer FUNCTION would invoke it as a getter
    // (`fn()`), producing `ctx=undefined` and a SSR crash. Pass through.
    eventRenderer: s.eventRenderer,
    dayHeaderRenderer: s.dayHeaderRenderer,
  };
});
// view + date are Refs<...> directly on state. The shell uses them
// as writable refs (header buttons mutate via `api.next/prev/setView`,
// which writes through the same refs).
const view = props.builder.state.view;
const date = props.builder.state.date;

// Resolve the effective locale. Order of precedence:
//   1. Explicit `locale` set via `builder.locale(...)`.
//   2. The shared `@cocoar/vue-localization` service's current
//      language (so a host app's locale switcher just works).
//   3. 'en-US' as a final fallback when neither is available.
const localization = useLocalization();
const { t } = useI18n();
const effectiveLocale = computed<string>(
  () => state.value.locale ?? localization?.language.value ?? 'en-US',
);

// ─── Cursor / view-window math ────────────────────────────────────

// the date ref is a PlainDate — no string parsing needed.
const cursor = computed<Temporal.PlainDate>(() => date.value);

const resolvedFirstDayOfWeek = computed(
  () => state.value.firstDayOfWeek ?? detectFirstDayOfWeekFromLocale(effectiveLocale.value),
);

const window = computed<ViewWindow>(() =>
  computeViewWindow({
    view: view.value,
    cursor: cursor.value,
    firstDayOfWeek: resolvedFirstDayOfWeek.value,
    agendaLengthDays: state.value.agendaLengthDays,
    timezone: state.value.timezone,
  }),
);

// The COMPOSER doesn't push the visible window itself — each sub-view
// mounts its own `useViewWindow`, which writes via the symbol-keyed
// `[SET_VISIBLE_RANGE]` privileged channel. Standalone sub-view usage
// works the same way as shell-driven usage; one writer per active view.

// ─── Navigation (header buttons) ──────────────────────────────────
// Header buttons go through the builder's api so the same code path
// handles caller-bound refs vs. the builder's internal fallback.

const goToToday = () => props.builder.api.goToToday();
const next = () => props.builder.api.next();
const prev = () => props.builder.api.prev();
const setView = (v: CalendarView) => props.builder.api.setView(v);

// ─── Range label ─────────────────────────────────────────────────

const rangeLabel = computed<string>(() => {
  const w = window.value;
  const start = Temporal.PlainDate.from(w.start);
  const lastVisible = Temporal.PlainDate.from(w.end).subtract({ days: 1 });
  const locale = effectiveLocale.value;
  const fmtOverrides = {
    dateStyle: state.value.dateStyle,
    timeStyle: state.value.timeStyle,
    hour12: state.value.hour12,
  };
  switch (view.value) {
    case 'day': {
      return new Intl.DateTimeFormat(
        locale,
        buildFormatOptions(
          { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' },
          fmtOverrides,
        ),
      ).format(toDate(cursor.value));
    }
    case 'week':
    case 'workWeek': {
      // The window is the full Mon–Sun span for workWeek too; the
      // label reflects that span (not the filtered render set) so
      // navigation reads consistently with week view.
      const fmt = new Intl.DateTimeFormat(
        locale,
        buildFormatOptions(
          { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
          fmtOverrides,
        ),
      );
      return fmt.formatRange(toDate(start), toDate(lastVisible));
    }
    case 'month': {
      return new Intl.DateTimeFormat(
        locale,
        buildFormatOptions(
          { year: 'numeric', month: 'long', timeZone: 'UTC' },
          fmtOverrides,
        ),
      ).format(toDate(cursor.value));
    }
    case 'agenda': {
      const fmt = new Intl.DateTimeFormat(
        locale,
        buildFormatOptions(
          { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
          fmtOverrides,
        ),
      );
      return fmt.formatRange(toDate(start), toDate(lastVisible));
    }
    default:
      return '';
  }
});

function toDate(d: Temporal.PlainDate): Date {
  // Anchor at UTC midnight so Intl with timeZone:'UTC' renders the
  // exact calendar date and never drifts by a day.
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
}

// ─── View-switcher labels ────────────────────────────────────────

const viewLabels = computed<Record<CalendarView, string>>(() => ({
  day: t('coar.calendar.view.day', undefined, 'Day'),
  week: t('coar.calendar.view.week', undefined, 'Week'),
  workWeek: t('coar.calendar.view.workWeek', undefined, 'Work week'),
  month: t('coar.calendar.view.month', undefined, 'Month'),
  agenda: t('coar.calendar.view.agenda', undefined, 'Agenda'),
  timeline: t('coar.calendar.view.timeline', undefined, 'Timeline'),
  year: t('coar.calendar.view.year', undefined, 'Year'),
}));

const viewSwitcherOptions = computed(() =>
  state.value.availableViews.map((v) => ({ value: v, label: viewLabels.value[v] })),
);

// ─── Header controls bag (passed to slots) ───────────────────────

const headerControls = computed<HeaderControls>(() => ({
  prev,
  next,
  goToToday,
  setView,
  rangeLabel: rangeLabel.value,
  view: view.value,
  available: state.value.availableViews,
}));

// Sub-views read `state.onEventClick` / `state.onEventDrop` etc.
// directly per-call (C7), so the shell doesn't forward events through
// any local handlers — consumers wire callbacks via `builder.onEventX(...)`.

// ─── Imperative scroll delegation ────────────────────────────────
// Day / Week views render a CoarTimeGrid whose sticky day-header
// and all-day band live INSIDE the calendar's scroll container
// (`.coar-calendar__body--day` / `--week`). Setting `scrollTop` on
// a sub-view's root element doesn't scroll anything (those roots
// have no overflow); we have to scroll the body. We locate the
// hour-label element by `data-hour` and align its top edge with
// the body's content area, accounting for the sticky band that
// sits above it. Agenda's `scrollToDate` still delegates to the
// sub-view since it owns its own virtualized scroll surface.

const bodyEl = useTemplateRef<HTMLElement>('bodyEl');
// `CoarAgendaView` is a generic SFC; `InstanceType<typeof CoarAgendaView>`
// trips vue-tsc because the generic constructor signature doesn't satisfy
// `abstract new (...args: any) => any`. We only call `scrollToDate` on the
// instance, so a structural type is enough.
const agendaRef = useTemplateRef<{ scrollToDate?: (d: Temporal.PlainDate) => void } | null>('agendaView');

/**
 * Smooth-scroll the calendar body from its current `scrollTop` to
 * `target` over ~100 ms with a subtle ease-out. Native
 * `scroll-behavior: smooth` runs at the browser's default duration
 * (~300 ms in Chrome) which feels sluggish for a deliberate
 * "jump to this hour" action — we want it to land quickly. Honours
 * `prefers-reduced-motion` (instant jump). One animation at a
 * time: a new `scrollToTime` while one is in flight cancels the
 * previous via the `cancelToken` ref.
 */
const SCROLL_ANIM_MS = 100;
let scrollAnimToken = 0;
function smoothScrollBodyTo(body: HTMLElement, target: number): void {
  // Local `window` is a `ViewWindow` computed that shadows the global —
  // reach the browser one explicitly via globalThis.
  const reduced = (globalThis as unknown as Window).matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    body.scrollTop = target;
    return;
  }
  const start = body.scrollTop;
  const delta = target - start;
  if (Math.abs(delta) < 1) {
    body.scrollTop = target;
    return;
  }
  const t0 = performance.now();
  const myToken = ++scrollAnimToken;
  function step(now: number): void {
    if (myToken !== scrollAnimToken) return; // superseded
    const t = Math.min(1, (now - t0) / SCROLL_ANIM_MS);
    // easeOutCubic — quick start, soft landing.
    const eased = 1 - Math.pow(1 - t, 3);
    body.scrollTop = start + delta * eased;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

onMounted(() => {
  // api.scrollToTime takes Temporal.PlainTime — extract hour.
  props.builder._setScrollToTime((time: Temporal.PlainTime) => {
    const hour = time.hour;
    if (view.value !== 'day' && view.value !== 'week') return;
    const body = bodyEl.value;
    if (!body) return;
    const label = body.querySelector<HTMLElement>(`.coar-time-grid__hour-label[data-hour="${hour}"]`);
    if (!label) return;
    // Find the sticky band's bottom edge in viewport-space so the
    // chosen hour lands just below it instead of being hidden
    // behind it.
    const stickyTop = body.querySelector<HTMLElement>('.coar-time-grid__sticky-top');
    const bodyTop = body.getBoundingClientRect().top;
    const stickyBottom = stickyTop
      ? stickyTop.getBoundingClientRect().bottom
      : bodyTop;
    const labelTop = label.getBoundingClientRect().top;
    smoothScrollBodyTo(body, body.scrollTop + (labelTop - stickyBottom));
  });
  // api.scrollToDate takes Temporal.PlainDate — pass through ISO
  // for now (agenda sub-view will be re-aligned to PlainDate in C-4).
  props.builder._setScrollToDate((d: Temporal.PlainDate) => {
    if (view.value === 'agenda') {
      const ag = agendaRef.value as { scrollToDate?: (iso: string) => void } | null;
      ag?.scrollToDate?.(d.toString());
    }
  });
  props.builder._setGridReady(true);

  // `date` is a Ref<PlainDate> from the builder's construction-time
  // fallback (today in the browser-detected zone). No string-init dance.
});

onBeforeUnmount(() => {
  props.builder._setScrollToTime(undefined);
  props.builder._setScrollToDate(undefined);
  props.builder._setGridReady(false);
});
</script>

<template>
  <div class="coar-calendar" :class="[`coar-calendar--density-${state.density}`]">
    <!-- ── Header ──────────────────────────────────────────────── -->
    <slot name="header" :view="view" :cursor="cursor" :range="window" :controls="headerControls">
      <header class="coar-calendar__header">
        <slot name="headerStart" :controls="headerControls" />
        <div class="coar-calendar__nav">
          <CoarButton
            variant="secondary"
            size="s"
            icon-start="chevron-left"
            :aria-label="t('coar.calendar.nav.previous', undefined, 'Previous')"
            @click="prev"
          />
          <CoarButton variant="secondary" size="s" @click="goToToday">
            {{ t('coar.calendar.nav.today', undefined, 'Today') }}
          </CoarButton>
          <CoarButton
            variant="secondary"
            size="s"
            icon-start="chevron-right"
            :aria-label="t('coar.calendar.nav.next', undefined, 'Next')"
            @click="next"
          />
        </div>
        <span class="coar-calendar__range-label">{{ rangeLabel }}</span>
        <span class="coar-calendar__spacer" />
        <slot
          name="viewSwitcher"
          :view="view"
          :available="state.availableViews"
          :set-view="setView"
        >
          <CoarSegmentedControl
            v-model="view"
            :options="viewSwitcherOptions"
            size="s"
            :aria-label="t('coar.calendar.viewSwitcher.label', undefined, 'Change view')"
          />
        </slot>
        <slot name="headerEnd" :controls="headerControls" />
      </header>
    </slot>

    <!--
      Body: dispatch to the active view.
      Day / Week views rely on the consumer to provide vertical
      scroll (CoarTimeGrid renders its full hour-range as natural
      flow with sticky header + all-day band). Month / Agenda manage
      their own height (Month is fixed-grid; Agenda is virtualized
      internally), so the body must NOT scroll there or we'd get a
      double scrollbar / collapsed agenda.
    -->
    <div
      ref="bodyEl"
      class="coar-calendar__body"
      :class="`coar-calendar__body--${view}`"
    >
      <CoarDayView v-if="view === 'day'" :builder="props.builder">
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
        <template v-if="$slots.dayHeader" #dayHeader="slotProps">
          <slot name="dayHeader" v-bind="slotProps" />
        </template>
      </CoarDayView>

      <CoarWeekView v-else-if="view === 'week'" :builder="props.builder">
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
        <template v-if="$slots.allDayEvent" #allDayEvent="slotProps">
          <slot name="allDayEvent" v-bind="slotProps" />
        </template>
        <template v-if="$slots.dayHeader" #dayHeader="slotProps">
          <slot name="dayHeader" v-bind="slotProps" />
        </template>
      </CoarWeekView>

      <CoarWorkWeekView v-else-if="view === 'workWeek'" :builder="props.builder">
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
        <template v-if="$slots.allDayEvent" #allDayEvent="slotProps">
          <slot name="allDayEvent" v-bind="slotProps" />
        </template>
        <template v-if="$slots.dayHeader" #dayHeader="slotProps">
          <slot name="dayHeader" v-bind="slotProps" />
        </template>
      </CoarWorkWeekView>

      <CoarMonthView
        v-else-if="view === 'month'"
        :builder="props.builder"
      >
        <template v-if="$slots.pill || $slots.event" #pill="slotProps">
          <slot
            v-if="$slots.pill"
            name="pill"
            v-bind="slotProps"
          />
          <slot
            v-else
            name="event"
            :event="slotProps.event"
            :view="view"
            :layout="slotProps.pill"
          />
        </template>
        <template v-if="$slots.multiDayBar || $slots.event" #multiDayBar="slotProps">
          <slot
            v-if="$slots.multiDayBar"
            name="multiDayBar"
            v-bind="slotProps"
          />
          <slot
            v-else
            name="event"
            :event="slotProps.event"
            :view="view"
            :layout="slotProps.bar"
          />
        </template>
      </CoarMonthView>

      <CoarAgendaView
        v-else-if="view === 'agenda'"
        ref="agendaView"
        :builder="props.builder"
      >
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
      </CoarAgendaView>
    </div>
  </div>
</template>

<style scoped>
.coar-calendar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--coar-background-neutral-primary);
  font-family: var(--coar-body-base-family);
  color: var(--coar-text-neutral-primary);
}

.coar-calendar__header {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-m);
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-primary);
  flex: 0 0 auto;
}

.coar-calendar__nav {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
}

.coar-calendar__range-label {
  font-size: var(--coar-component-m-font-size);
  font-weight: 600;
  color: var(--coar-text-neutral-primary);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coar-calendar__spacer {
  flex: 1 1 auto;
}

.coar-calendar__body {
  flex: 1 1 auto;
  min-height: 0; /* allow children's overflow:auto to work */
}
.coar-calendar__body--day,
.coar-calendar__body--week {
  /* Time-grid views scroll vertically through the hour range. */
  overflow-y: auto;
  overflow-x: hidden;
}
.coar-calendar__body--month {
  /* Month was a fixed 6×7 grid before Phase 2.3e — now any row
     can grow when the user expands a day's pill list. Allow
     vertical scroll so expanded rows that push the grid past the
     calendar height stay reachable. */
  overflow-y: auto;
  overflow-x: hidden;
}
.coar-calendar__body--agenda {
  /* Agenda is internally virtualized; let it own the scroll. */
  overflow: hidden;
}
</style>
