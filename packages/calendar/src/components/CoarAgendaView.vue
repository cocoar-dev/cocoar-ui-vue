<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarAgendaView>` — chronological list of events grouped by day.
 *
 * Public surface: ONE prop, `:builder: CoarAgendaBuilder`.
 *
 * Built on `VirtualizedSurface1DY` with VARIABLE item sizes — day-
 * header rows and event rows each get their natural height. The
 * measurement cache + anchor restoration from Spike A handle the
 * variable heights.
 *
 * Items come from the pure-function `buildAgendaItems` in
 * `core/agendaLayout`. The slot dispatches based on `item.kind`:
 *
 *   - `header` → `<CoarAgendaDayHeader>` (with `#dayGroupHeader` slot)
 *   - `event`  → `<CoarAgendaEvent>` (with `#event` slot)
 *
 * Sticky day-headers: the inline header rows scroll with the list
 * (they're absolutely positioned inside the virtual spacer, so CSS
 * `position: sticky` cannot work). To keep the current day's label
 * visible, a separate FLOATING `<CoarAgendaDayHeader floating>` is
 * rendered as a sibling of the surface inside the wrapper. It tracks
 * `scrollTop` on the surface and shows the most recent header
 * at-or-before the topmost visible item.
 */

import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  useTemplateRef,
  watchEffect,
} from 'vue';
import { useI18n, useLocalization } from '@cocoar/vue-localization';
import VirtualizedSurface1DY from './VirtualizedSurface1DY.vue';
import {
  Temporal,
  buildAgendaItems,
  detectFirstDayOfWeekFromLocale,
  startOfWeek,
  todayInZone,
  buildFormatOptions,
  type AgendaItem,
  type AgendaEventItem,
  type AgendaHeaderItem,
  type CalendarEvent,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import CoarAgendaDayHeader from './internal/agenda/CoarAgendaDayHeader.vue';
import CoarAgendaEvent from './internal/agenda/CoarAgendaEvent.vue';
import { agendaTimeLabel } from './internal/agenda/agendaTimeLabel';
import { useViewWindow } from '../composables/useViewWindow';

// Inlined defineProps argument to avoid vue-tsc TS4025 — see note in
// CoarMonthView.vue.
const props = withDefaults(
  defineProps<{
    builder: CalendarBuilder<TMeta>;
    /** Agenda surface semantics: rolling agenda, one-day list, or current-month list. */
    view?: 'agenda' | 'dayAgenda' | 'monthList';
    /** Estimate for variable-size virtualization. Default 64 px. */
    estimatedItemSize?: number;
    /** Items beyond the viewport rendered each direction. Default 5. */
    overscan?: number;
  }>(),
  {
    view: 'agenda',
    estimatedItemSize: 64,
    overscan: 5,
  },
);

const { t } = useI18n();

defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; item: AgendaEventItem<TMeta> }): unknown;
  dayGroupHeader?(props: {
    date: Temporal.PlainDate;
    item: AgendaHeaderItem;
    isToday: boolean;
  }): unknown;
  /**
   * Shown when the list draws NOTHING — no events in the window and
   * no empty-day headers (`showEmptyDays` off) — and no load is in
   * flight. No default: without the slot the surface stays blank,
   * as before. Rendered as an overlay above the (empty) surface so
   * the virtualized list stays mounted and scroll-to-date refs stay
   * valid.
   */
  empty?(): unknown;
}>();

// ─── Builder bindings ────────────────────────────────────────────────
// snapshot adapter.
const state = computed(() => {
  const s = props.builder.state;
  return {
    // Phase 4: read via api.getVisibleEvents() so events from
    // `events()` / `eventsLoader()` AND expanded occurrences from
    // `series()` / `seriesLoader()` all reach the layout.
    events: props.builder.api.getVisibleEvents(),
    timezone: toValue(s.timezone),
    locale: toValue(s.locale),
    firstDayOfWeek: toValue(s.firstDayOfWeek),
    density: toValue(s.density),
    dateStyle: toValue(s.dateStyle),
    timeStyle: toValue(s.timeStyle),
    hour12: toValue(s.hour12),
    showEmptyDays: toValue(s.showEmptyDays),
    agendaLengthDays: toValue(s.agendaLengthDays),
    eventRenderer: s.eventRenderer,
  };
});
const events = computed(() => state.value.events);
const timezone = computed(() => state.value.timezone);
// Locale chain (Article 9): builder.locale() > host service > 'en-US'.
const localization = useLocalization();
const locale = computed<string>(
  () => state.value.locale ?? localization?.language.value ?? 'en-US',
);
const density = computed(() => state.value.density);
const showEmptyDays = computed(() => state.value.showEmptyDays);
const agendaLengthDays = computed(() => state.value.agendaLengthDays);
const cursor = computed(() => props.builder.state.date.value);
const resolvedFirstDayOfWeek = computed(
  () => state.value.firstDayOfWeek ?? detectFirstDayOfWeekFromLocale(locale.value),
);
const dayAgendaDates = computed(() => {
  const start = startOfWeek(cursor.value, resolvedFirstDayOfWeek.value);
  return Array.from({ length: 7 }, (_, index) => start.add({ days: index }));
});

// Push visible window into the builder for standalone usage (loader /
// onRangeChange / api.getVisibleRange).
useViewWindow(props.builder, { view: props.view });

/**
 * Visible date window — derived from the builder's cursor (date)
 * + agendaLengthDays. The window is inclusive on the start day,
 * exclusive on the end day, mirroring the standalone-prop API
 * the view used to take.
 */
// Builder state.date is already a Temporal.PlainDate (Article 4) — no
// normalization needed; expose it under the existing name so the rest
// of the file keeps working.
const cursorDate = computed(() => cursor.value);
const rangeStartDate = computed(() =>
  props.view === 'monthList' ? cursorDate.value.with({ day: 1 }) : cursorDate.value,
);
const rangeEndDate = computed(() => {
  if (props.view === 'dayAgenda') return rangeStartDate.value.add({ days: 1 });
  if (props.view === 'monthList') return rangeStartDate.value.add({ months: 1 });
  return rangeStartDate.value.add({ days: agendaLengthDays.value });
});
const rangeStart = computed(() => rangeStartDate.value.toString());
const rangeEnd = computed(() => rangeEndDate.value.toString());

// ─── Items ───────────────────────────────────────────────────────────

/**
 * The empty state only appears when nothing at all is drawn. With
 * `showEmptyDays` the list draws headers, so a "no events" message
 * would be redundant; during a load it would flash and then be
 * replaced — worse than none.
 */
const showEmptyState = computed(
  () => items.value.length === 0 && !showEmptyDays.value && !props.builder.api.loading.value,
);

const items = computed<AgendaItem[]>(() =>
  buildAgendaItems(events.value, {
    rangeStart: rangeStart.value,
    rangeEnd: rangeEnd.value,
    timezone: timezone.value,
    showEmptyDays: showEmptyDays.value,
  }),
);

// ─── Today ───────────────────────────────────────────────────────────

const today = ref<Temporal.PlainDate>(todayInZone(timezone.value));
watchEffect(() => {
  today.value = todayInZone(timezone.value);
});

function isToday(date: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(date, today.value) === 0;
}

// ─── Default formatters ──────────────────────────────────────────────

const headerFormatter = computed(() => {
  return new Intl.DateTimeFormat(
    locale.value,
    buildFormatOptions(
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      },
      {
        dateStyle: state.value.dateStyle,
        timeStyle: state.value.timeStyle,
        hour12: state.value.hour12,
      },
    ),
  );
});
const timeFormatter = computed(() => {
  return new Intl.DateTimeFormat(
    locale.value,
    buildFormatOptions(
      {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone.value,
      },
      {
        timeStyle: state.value.timeStyle,
        hour12: state.value.hour12,
      },
    ),
  );
});

function formatHeaderDate(iso: string): string {
  // Header dates are calendar dates (no zone); we anchor at UTC
  // midnight and format in UTC so the weekday label can never
  // drift by a day vs. the date key the agenda layout produced.
  const d = new Date(iso + 'T00:00:00Z');
  return headerFormatter.value.format(d);
}

function formatWeekStripWeekday(date: Temporal.PlainDate): string {
  return new Intl.DateTimeFormat(locale.value, {
    weekday: 'narrow',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function selectDayAgendaDate(event: MouseEvent, date: Temporal.PlainDate): void {
  props.builder.api.goTo(date);
  // The public callback predates button-backed selectors and names its native
  // input PointerEvent. A keyboard-activated button produces MouseEvent; keep
  // that activation path working while preserving the existing callback API.
  props.builder.state.onDateClick?.({ date, native: event as unknown as PointerEvent });
}

function formatEventTime(event: CalendarEvent<TMeta>): string {
  return agendaTimeLabel(
    event,
    (ms) => timeFormatter.value.format(new Date(ms)),
    t('coar.calendar.agenda.allDay', undefined, 'All day'),
  );
}

function eventTitle(event: CalendarEvent<TMeta>): string {
  const meta = event.meta as { title?: unknown } | undefined;
  return typeof meta?.title === 'string' ? meta.title : '(untitled)';
}
function eventColor(event: CalendarEvent<TMeta>): string | undefined {
  const meta = event.meta as { color?: unknown } | undefined;
  return typeof meta?.color === 'string' ? meta.color : undefined;
}
function eventColorOrDefault(event: CalendarEvent<TMeta>): string {
  return eventColor(event) ?? 'var(--coar-color-accent, var(--coar-color-accent-500, #2563eb))';
}

// ─── Click handlers ──────────────────────────────────────────────────

function onEventClick(e: PointerEvent, event: CalendarEvent<TMeta>) {
  props.builder.state.onEventClick?.({ event, native: e });
}
function onHeaderClick(e: PointerEvent, dateIso: string) {
  props.builder.state.onDateClick?.({
    date: Temporal.PlainDate.from(dateIso),
    native: e,
  });
}

// ─── Floating sticky header (overlay) ────────────────────────────────

const surfaceRef = useTemplateRef<InstanceType<typeof VirtualizedSurface1DY>>('surface');
const scrollTop = ref(0);
let scrollEl: HTMLElement | null = null;

function onSurfaceScroll() {
  if (scrollEl) scrollTop.value = scrollEl.scrollTop;
}

onMounted(() => {
  const root = (surfaceRef.value as unknown as { $el?: HTMLElement } | null)?.$el ?? null;
  if (root) {
    scrollEl = root;
    scrollEl.addEventListener('scroll', onSurfaceScroll, { passive: true });
    scrollTop.value = scrollEl.scrollTop;
  }
  // Register imperative scrollToDate on the builder so
  // CoarCalendar.api.scrollToDate finds it. The public API takes
  // Temporal.PlainDate; the inner scrollToDate uses the ISO string
  // form (matches the items[].date keys), so adapt at the boundary.
  props.builder._setScrollToDate((d: Temporal.PlainDate) => scrollToDate(d.toString()));
});
onBeforeUnmount(() => {
  if (scrollEl) {
    scrollEl.removeEventListener('scroll', onSurfaceScroll);
    scrollEl = null;
  }
  props.builder._setScrollToDate(undefined);
});

const overlayHeight = ref(0);

const floatingState = computed<{
  current: AgendaHeaderItem;
  pushOffset: number;
} | null>(() => {
  const top = scrollTop.value;
  if (items.value.length === 0) return null;
  const surface = surfaceRef.value;
  if (!surface) return null;

  const cache = surface.getCache();
  const list = items.value;

  let currentIdx = -1;
  let nextIdx = -1;
  let nextY = Infinity;
  for (let i = 0; i < list.length; i++) {
    if (list[i].kind !== 'header') continue;
    const y = cache.prefixSum(i);
    if (y <= top) {
      currentIdx = i;
    } else {
      nextIdx = i;
      nextY = y;
      break;
    }
  }
  if (currentIdx < 0) return null;

  let pushOffset = 0;
  if (nextIdx >= 0 && overlayHeight.value > 0) {
    const gap = nextY - top;
    if (gap < overlayHeight.value) {
      pushOffset = overlayHeight.value - gap;
    }
  }

  return {
    current: list[currentIdx] as AgendaHeaderItem,
    pushOffset,
  };
});

const floatingHeader = computed(() => floatingState.value?.current ?? null);
const floatingTransform = computed(() => {
  const o = floatingState.value?.pushOffset ?? 0;
  return o > 0 ? `translateY(-${o}px)` : 'none';
});

const overlayElRef = useTemplateRef<InstanceType<typeof CoarAgendaDayHeader>>('overlayEl');
function measureOverlay() {
  const inst = overlayElRef.value as unknown as { $el?: HTMLElement } | null;
  if (inst?.$el) overlayHeight.value = inst.$el.offsetHeight;
}
watchEffect(measureOverlay);

// ─── Imperative API ──────────────────────────────────────────────────

function scrollToDate(dateIso: string): void {
  const idx = items.value.findIndex((it) => it.kind === 'header' && it.date === dateIso);
  if (idx >= 0) surfaceRef.value?.scrollToIndex(idx);
}

defineExpose({
  /** Snapshot of the current items list. */
  getItems: () => items.value,
  scrollToDate,
});
</script>

<template>
  <div
    class="coar-agenda-view"
    :class="[`coar-agenda-view--density-${density}`]"
    role="region"
    :aria-label="t('coar.calendar.agenda.viewLabel', undefined, 'Agenda view')"
  >
    <div
      v-if="view === 'dayAgenda'"
      class="coar-agenda-view__week-strip"
      role="tablist"
      :aria-label="t('coar.calendar.dayAgenda.weekLabel', undefined, 'Week')"
    >
      <button
        v-for="date in dayAgendaDates"
        :key="date.toString()"
        type="button"
        role="tab"
        class="coar-agenda-view__week-day"
        :class="{
          'coar-agenda-view__week-day--selected': Temporal.PlainDate.compare(date, cursor) === 0,
          'coar-agenda-view__week-day--today': isToday(date),
        }"
        :aria-selected="Temporal.PlainDate.compare(date, cursor) === 0"
        :aria-label="formatHeaderDate(date.toString())"
        @click="selectDayAgendaDate($event, date)"
      >
        <span class="coar-agenda-view__week-day-name">{{ formatWeekStripWeekday(date) }}</span>
        <span class="coar-agenda-view__week-day-number">{{ date.day }}</span>
      </button>
    </div>

    <!--
      Floating sticky header overlay. Rendered even at scrollTop=0
      to avoid a 1 px snap on the first scroll tick (otherwise the
      inline header crosses scrollTop=-1 and the overlay pops in,
      briefly leaving a 1 px stripe of clipped inline text).
    -->
    <CoarAgendaDayHeader
      v-if="floatingHeader && view !== 'dayAgenda'"
      ref="overlayEl"
      floating
      :date="Temporal.PlainDate.from(floatingHeader.date)"
      :item="floatingHeader"
      :is-today="isToday(Temporal.PlainDate.from(floatingHeader.date))"
      :label="formatHeaderDate(floatingHeader.date)"
      :today-label="t('coar.calendar.agenda.todayBadge', undefined, 'today')"
      :transform="floatingTransform"
      @pointerdown="onHeaderClick($event, floatingHeader.date)"
    >
      <template v-if="$slots.dayGroupHeader" #default="slotProps">
        <slot name="dayGroupHeader" v-bind="slotProps" />
      </template>
    </CoarAgendaDayHeader>

    <VirtualizedSurface1DY
      ref="surface"
      role="list"
      :aria-label="t('coar.calendar.agenda.listLabel', undefined, 'Agenda')"
      :item-count="items.length"
      :estimated-item-size="estimatedItemSize"
      :overscan="overscan"
      class="coar-agenda-view__surface"
    >
      <template #item="{ y }">
        <template v-if="items[y].kind === 'header'">
          <CoarAgendaDayHeader
            :date="Temporal.PlainDate.from((items[y] as AgendaHeaderItem).date)"
            :item="items[y] as AgendaHeaderItem"
            :is-today="isToday(Temporal.PlainDate.from((items[y] as AgendaHeaderItem).date))"
            :label="formatHeaderDate((items[y] as AgendaHeaderItem).date)"
            :today-label="t('coar.calendar.agenda.todayBadge', undefined, 'today')"
            @pointerdown="onHeaderClick($event, (items[y] as AgendaHeaderItem).date)"
          >
            <template v-if="$slots.dayGroupHeader" #default="slotProps">
              <slot name="dayGroupHeader" v-bind="slotProps" />
            </template>
          </CoarAgendaDayHeader>
        </template>

        <template v-else>
          <CoarAgendaEvent
            :event="(items[y] as AgendaEventItem<TMeta>).event"
            :item="items[y] as AgendaEventItem<TMeta>"
            :time-label="formatEventTime((items[y] as AgendaEventItem<TMeta>).event)"
            :title="eventTitle((items[y] as AgendaEventItem<TMeta>).event)"
            :color="eventColorOrDefault((items[y] as AgendaEventItem<TMeta>).event)"
            :continuation-tag="t('coar.calendar.agenda.continuationTag', undefined, '(cont.)')"
            :display-zone="timezone"
            @pointerdown="onEventClick($event, (items[y] as AgendaEventItem<TMeta>).event)"
            @dblclick="
              props.builder.state.onEventDoubleClick?.({
                event: (items[y] as AgendaEventItem<TMeta>).event,
                native: $event,
              })
            "
            @pointerenter="
              props.builder.state.onEventHover?.({
                event: (items[y] as AgendaEventItem<TMeta>).event,
                native: $event,
              })
            "
            @pointerleave="
              props.builder.state.onEventHoverLeave?.({
                event: (items[y] as AgendaEventItem<TMeta>).event,
                native: $event,
              })
            "
          >
            <template v-if="$slots.event" #default="slotProps">
              <slot name="event" v-bind="slotProps" />
            </template>
          </CoarAgendaEvent>
        </template>
      </template>
    </VirtualizedSurface1DY>

    <div
      v-if="$slots.empty && showEmptyState"
      class="coar-agenda-view__empty"
      role="status"
      aria-live="polite"
    >
      <slot name="empty" />
    </div>
  </div>
</template>

<style scoped>
.coar-agenda-view {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--coar-calendar-bg, #fff);
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
  /* Fill the parent container's available height. */
  height: 100%;
  overflow: hidden;
}
.coar-agenda-view__surface {
  flex: 1 1 auto;
  min-height: 0;
  height: auto;
}

/* Overlay, not a replacement: the surface underneath stays mounted
   and keeps the anchor mechanics; the empty state takes no gestures. */
.coar-agenda-view__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--coar-spacing-l, 24px);
  color: var(--coar-text-subtle, #6c7280);
  pointer-events: none;
}

.coar-agenda-view__week-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  flex: 0 0 auto;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-primary);
}

.coar-agenda-view__week-day {
  display: flex;
  min-width: 0;
  min-height: 48px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 3px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--coar-text-neutral-primary);
  font: inherit;
  cursor: pointer;
}

.coar-agenda-view__week-day:hover:not(.coar-agenda-view__week-day--selected) {
  background: var(--coar-background-neutral-secondary);
}

.coar-agenda-view__week-day--selected {
  background: var(--coar-background-accent-primary);
  color: var(--coar-text-on-accent, white);
}

.coar-agenda-view__week-day--today:not(.coar-agenda-view__week-day--selected) {
  color: var(--coar-text-danger, #d70015);
}

.coar-agenda-view__week-day-name {
  font-size: var(--coar-component-xs-font-size);
  font-weight: 600;
  text-transform: uppercase;
}

.coar-agenda-view__week-day-number {
  font-size: var(--coar-component-s-font-size);
  font-weight: 700;
}

/* Density — compact tightens row padding + font size. The actual
   row + header CSS lives inside CoarAgendaEvent / CoarAgendaDayHeader.
   We feed the density signal via the wrapper class; their scoped
   CSS doesn't reach across the boundary, so until those children
   pick up `:density` props themselves the compact rule below is a
   no-op. Left in place to document the intent. */
</style>
