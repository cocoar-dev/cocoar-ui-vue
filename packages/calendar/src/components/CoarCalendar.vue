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
import CoarContinuousMonthView from './CoarContinuousMonthView.vue';
import CoarMonthListView from './CoarMonthListView.vue';
import CoarAgendaView from './CoarAgendaView.vue';
import CoarTimelineView from './CoarTimelineView.vue';
import CoarYearView from './CoarYearView.vue';
import {
  Temporal,
  computeViewWindow,
  detectFirstDayOfWeekFromLocale,
  buildFormatOptions,
  type CalendarEvent,
  type CalendarDayMode,
  type CalendarMonthDensity,
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
  /**
   * Render only the body — no header bar at all. For hosts that own
   * navigation and view selection themselves (drive the calendar
   * through `api.goTo / next / prev / setView / setMonthDensity /
   * setDayMode`). An empty `#header` slot does NOT do this: Vue
   * renders the built-in fallback when a slot yields no nodes.
   */
  hideHeader?: boolean;
  /** Keep the header (nav buttons, range label) but drop the primary view switcher. */
  hideViewSwitcher?: boolean;
  /** Keep the header but drop the Month / Day display-choice switcher. */
  hideModeSwitcher?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  hideHeader: false,
  hideViewSwitcher: false,
  hideModeSwitcher: false,
});

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
  /** Agenda empty state — forwarded to `<CoarAgendaView>`'s `empty`
   *  slot. Shown only when the agenda draws nothing and no load is
   *  in flight; no default. */
  agendaEmpty?(): unknown;
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
    monthDensity: toValue(s.monthDensity),
    dayMode: toValue(s.dayMode),
    dateStyle: toValue(s.dateStyle),
    timeStyle: toValue(s.timeStyle),
    hour12: toValue(s.hour12),
    availableViews: toValue(s.availableViews),
    timeRange: trTuple,
    timeRangeMinutes: tr,
    slotDuration: toValue(s.slotDuration),
    pixelsPerHour: toValue(s.pixelsPerHour),
    dayColumnCount: toValue(s.dayColumnCount),
    dayColumnMinWidth: toValue(s.dayColumnMinWidth),
    agendaLengthDays: toValue(s.agendaLengthDays),
    timelineRangeDays: toValue(s.timelineRangeDays),
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

const configuredWindow = computed<ViewWindow>(() =>
  computeViewWindow({
    view: view.value,
    cursor: cursor.value,
    firstDayOfWeek: resolvedFirstDayOfWeek.value,
    agendaLengthDays: state.value.agendaLengthDays,
    timelineRangeDays: state.value.timelineRangeDays,
    dayColumnCount: state.value.dayColumnCount,
    timezone: state.value.timezone,
  }),
);
const window = computed<ViewWindow>(() => {
  const rendered = props.builder.api.visibleRange.value;
  return rendered?.view === view.value ? rendered : configuredWindow.value;
});

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
      if (start.until(lastVisible, { largestUnit: 'day' }).days > 0) {
        const fmt = new Intl.DateTimeFormat(
          locale,
          buildFormatOptions(
            { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
            fmtOverrides,
          ),
        );
        return fmt.formatRange(toDate(start), toDate(lastVisible));
      }
      return new Intl.DateTimeFormat(
        locale,
        buildFormatOptions(
          { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' },
          fmtOverrides,
        ),
      ).format(toDate(cursor.value));
    }
    case 'dayAgenda': {
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
    case 'month':
    case 'monthList': {
      return new Intl.DateTimeFormat(
        locale,
        buildFormatOptions({ year: 'numeric', month: 'long', timeZone: 'UTC' }, fmtOverrides),
      ).format(toDate(cursor.value));
    }
    case 'agenda':
    case 'timeline': {
      // Both views span a configurable range of days; the label is
      // the formatted date-range bounds, same as agenda's existing
      // shape.
      const fmt = new Intl.DateTimeFormat(
        locale,
        buildFormatOptions(
          { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
          fmtOverrides,
        ),
      );
      return fmt.formatRange(toDate(start), toDate(lastVisible));
    }
    case 'year':
      return String(cursor.value.year);
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
  dayAgenda: t('coar.calendar.view.dayAgenda', undefined, 'Day agenda'),
  week: t('coar.calendar.view.week', undefined, 'Week'),
  workWeek: t('coar.calendar.view.workWeek', undefined, 'Work week'),
  month: t('coar.calendar.view.month', undefined, 'Month'),
  monthList: t('coar.calendar.view.monthList', undefined, 'List'),
  agenda: t('coar.calendar.view.agenda', undefined, 'Agenda'),
  timeline: t('coar.calendar.view.timeline', undefined, 'Timeline'),
  year: t('coar.calendar.view.year', undefined, 'Year'),
}));

const viewSwitcherOptions = computed(() =>
  state.value.availableViews
    .filter((candidate) => candidate !== 'monthList' && candidate !== 'dayAgenda')
    .map((candidate) => ({ value: candidate, label: viewLabels.value[candidate] })),
);

const navigationView = computed<CalendarView>({
  get: () =>
    view.value === 'monthList' ? 'month' : view.value === 'dayAgenda' ? 'day' : view.value,
  set: (next) => setView(next),
});

type CalendarMonthDisplay = CalendarMonthDensity | 'list';
const monthModeOptions = computed<ReadonlyArray<{ value: CalendarMonthDisplay; label: string }>>(
  () => [
    { value: 'compact', label: t('coar.calendar.monthMode.compact', undefined, 'Compact') },
    { value: 'stacked', label: t('coar.calendar.monthMode.stacked', undefined, 'Stacked') },
    { value: 'details', label: t('coar.calendar.monthMode.details', undefined, 'Details') },
    ...(state.value.availableViews.includes('monthList')
      ? [{ value: 'list' as const, label: t('coar.calendar.monthMode.list', undefined, 'List') }]
      : []),
  ],
);
const selectedMonthMode = computed<CalendarMonthDisplay>({
  get: () => (view.value === 'monthList' ? 'list' : state.value.monthDensity),
  set: (mode) => {
    if (mode === 'list') setView('monthList');
    else {
      props.builder.api.setMonthDensity(mode);
      if (view.value === 'monthList') setView('month');
    }
  },
});
const dayModeOptions = computed<ReadonlyArray<{ value: CalendarDayMode; label: string }>>(() => [
  { value: 'single', label: t('coar.calendar.dayMode.single', undefined, 'One day') },
  { value: 'multiDay', label: t('coar.calendar.dayMode.multiDay', undefined, 'Multi-day') },
]);
const selectedDayMode = computed<CalendarDayMode>({
  get: () => state.value.dayMode,
  set: (mode) => props.builder.api.setDayMode(mode),
});

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
const agendaRef = useTemplateRef<{ scrollToDate?: (d: Temporal.PlainDate) => void } | null>(
  'agendaView',
);

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
  const reduced = (globalThis as unknown as Window).matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;
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
    const label = body.querySelector<HTMLElement>(
      `.coar-time-grid__hour-label[data-hour="${hour}"]`,
    );
    if (!label) return;
    // Find the sticky band's bottom edge in viewport-space so the
    // chosen hour lands just below it instead of being hidden
    // behind it.
    const stickyTop = body.querySelector<HTMLElement>('.coar-time-grid__sticky-top');
    const bodyTop = body.getBoundingClientRect().top;
    const stickyBottom = stickyTop ? stickyTop.getBoundingClientRect().bottom : bodyTop;
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
    <slot
      v-if="!props.hideHeader"
      name="header"
      :view="view"
      :cursor="cursor"
      :range="window"
      :controls="headerControls"
    >
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
        <div v-if="!props.hideViewSwitcher" class="coar-calendar__view-switcher">
          <slot
            name="viewSwitcher"
            :view="view"
            :available="state.availableViews"
            :set-view="setView"
          >
            <CoarSegmentedControl
              v-model="navigationView"
              :options="viewSwitcherOptions"
              size="s"
              :aria-label="t('coar.calendar.viewSwitcher.label', undefined, 'Change view')"
            />
          </slot>
        </div>
        <div
          v-if="
            !props.hideModeSwitcher && navigationView === 'month' && monthModeOptions.length > 1
          "
          class="coar-calendar__mode-switcher"
        >
          <CoarSegmentedControl
            v-model="selectedMonthMode"
            :options="monthModeOptions"
            size="xs"
            aria-label="Month display"
          />
        </div>
        <div
          v-else-if="
            !props.hideModeSwitcher && navigationView === 'day' && dayModeOptions.length > 1
          "
          class="coar-calendar__mode-switcher"
        >
          <CoarSegmentedControl
            v-model="selectedDayMode"
            :options="dayModeOptions"
            size="xs"
            aria-label="Day display"
          />
        </div>
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
    <div ref="bodyEl" class="coar-calendar__body" :class="`coar-calendar__body--${view}`">
      <CoarDayView v-if="view === 'day'" :builder="props.builder">
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
        <template v-if="$slots.dayHeader" #dayHeader="slotProps">
          <slot name="dayHeader" v-bind="slotProps" />
        </template>
      </CoarDayView>

      <CoarAgendaView
        v-else-if="view === 'dayAgenda'"
        ref="agendaView"
        :builder="props.builder"
        view="dayAgenda"
      >
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
      </CoarAgendaView>

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

      <CoarContinuousMonthView v-else-if="view === 'month'" :builder="props.builder">
        <template v-if="$slots.pill || $slots.event" #pill="slotProps">
          <slot v-if="$slots.pill" name="pill" v-bind="slotProps" />
          <slot
            v-else
            name="event"
            :event="slotProps.event"
            :view="view"
            :layout="slotProps.pill"
          />
        </template>
        <template v-if="$slots.multiDayBar || $slots.event" #multiDayBar="slotProps">
          <slot v-if="$slots.multiDayBar" name="multiDayBar" v-bind="slotProps" />
          <slot v-else name="event" :event="slotProps.event" :view="view" :layout="slotProps.bar" />
        </template>
      </CoarContinuousMonthView>

      <CoarMonthListView v-else-if="view === 'monthList'" :builder="props.builder">
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
      </CoarMonthListView>

      <CoarAgendaView v-else-if="view === 'agenda'" ref="agendaView" :builder="props.builder">
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
        <template v-if="$slots.agendaEmpty" #empty>
          <slot name="agendaEmpty" />
        </template>
      </CoarAgendaView>

      <CoarTimelineView v-else-if="view === 'timeline'" :builder="props.builder">
        <template v-if="$slots.event" #bar="slotProps">
          <!-- Timeline-specific layout context — not a Day/Week/Month
               variant, so we forward only `event` + `view` to the
               universal slot. Consumers wanting timeline-row geometry
               use the dedicated `#bar` slot on `<CoarTimelineView>`
               directly. -->
          <slot name="event" :event="slotProps.event" :view="view" />
        </template>
      </CoarTimelineView>

      <CoarYearView v-else-if="view === 'year'" :builder="props.builder" />
    </div>
  </div>
</template>

<style scoped>
.coar-calendar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  container-type: inline-size;
  background: var(--coar-background-neutral-primary);
  font-family: var(--coar-body-base-family);
  color: var(--coar-text-neutral-primary);
}

.coar-calendar__header {
  display: flex;
  flex-wrap: wrap;
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

.coar-calendar__view-switcher {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.coar-calendar__view-switcher :deep(.coar-segmented-control) {
  display: flex;
  width: max-content;
}

.coar-calendar__mode-switcher {
  flex: 0 0 auto;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
}

@media (max-width: 48rem) {
  .coar-calendar__spacer {
    display: none;
  }

  .coar-calendar__view-switcher {
    flex-basis: 100%;
  }
}

/* Consumers often place the calendar beside a persistent sidebar. React to the calendar's actual
   width rather than the viewport so every view remains reachable without a clipped horizontal pill. */
@container (max-width: 42rem) {
  .coar-calendar__spacer {
    display: none;
  }

  .coar-calendar__view-switcher {
    flex: 1 0 100%;
    overflow: visible;
  }

  .coar-calendar__view-switcher :deep(.coar-segmented-control) {
    display: flex;
    flex-wrap: wrap;
    gap: var(--coar-spacing-xs);
    width: 100%;
    border: 0;
    overflow: visible;
    background: transparent;
  }

  .coar-calendar__view-switcher :deep(.coar-segmented-control__segment) {
    flex: 1 0 auto;
    border: 1px solid var(--coar-border-neutral-tertiary);
    border-radius: var(--coar-button-radius);
  }
}

.coar-calendar__body {
  flex: 1 1 auto;
  min-height: 0; /* allow children's overflow:auto to work */
}
.coar-calendar__body--day,
.coar-calendar__body--week,
.coar-calendar__body--workWeek {
  /* Time-grid views scroll vertically through the hour range. */
  overflow-y: auto;
  overflow-x: hidden;
}
.coar-calendar__body--month {
  /* The continuous month surface owns its scrolling so it can preserve
     semantic month anchors while rows reflow between densities. */
  overflow: hidden;
}
.coar-calendar__body--agenda {
  /* Agenda is internally virtualized; let it own the scroll. */
  overflow: hidden;
}
.coar-calendar__body--monthList,
.coar-calendar__body--year {
  overflow: hidden;
}
</style>
