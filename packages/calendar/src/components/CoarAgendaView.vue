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

import { computed, onBeforeUnmount, onMounted, ref, toValue, useTemplateRef, watchEffect } from 'vue';
import { useI18n, useLocalization } from '@cocoar/vue-localization';
import VirtualizedSurface1DY from './VirtualizedSurface1DY.vue';
import {
  Temporal,
  buildAgendaItems,
  todayInZone,
  isAllDayEvent,
  isTimedEvent,
  buildFormatOptions,
  type AgendaItem,
  type AgendaEventItem,
  type AgendaHeaderItem,
  type CalendarEvent,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import CoarAgendaDayHeader from './internal/agenda/CoarAgendaDayHeader.vue';
import CoarAgendaEvent from './internal/agenda/CoarAgendaEvent.vue';
import { useViewWindow } from '../composables/useViewWindow';

// Inlined defineProps argument to avoid vue-tsc TS4025 — see note in
// CoarMonthView.vue.
const props = withDefaults(
  defineProps<{
    builder: CalendarBuilder<TMeta>;
    /** Estimate for variable-size virtualization. Default 64 px. */
    estimatedItemSize?: number;
    /** Items beyond the viewport rendered each direction. Default 5. */
    overscan?: number;
  }>(),
  {
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
}>();

// ─── Builder bindings ────────────────────────────────────────────────
// snapshot adapter.
const state = computed(() => {
  const s = props.builder.state;
  return {
    events: s.events ? toValue(s.events) : [],
    timezone: toValue(s.timezone),
    locale: toValue(s.locale),
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

// Push visible window into the builder for standalone usage (loader /
// onRangeChange / api.getVisibleRange).
useViewWindow(props.builder, { view: 'agenda' });

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
const rangeStart = computed(() => cursorDate.value.toString());
const rangeEnd = computed(() =>
  cursorDate.value.add({ days: agendaLengthDays.value }).toString(),
);

// ─── Items ───────────────────────────────────────────────────────────

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

function formatEventTime(event: CalendarEvent<TMeta>): string {
  if (isAllDayEvent(event)) {
    return t('coar.calendar.agenda.allDay', undefined, 'All day');
  }
  if (!isTimedEvent(event)) return '';
  return timeFormatter.value.format(new Date(event.start.epochMilliseconds));
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
  return eventColor(event) ?? 'var(--coar-color-accent, #2563eb)';
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
  props.builder._setScrollToDate((d: Temporal.PlainDate) =>
    scrollToDate(d.toString()),
  );
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
  const idx = items.value.findIndex(
    (it) => it.kind === 'header' && it.date === dateIso,
  );
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
    <!--
      Floating sticky header overlay. Rendered even at scrollTop=0
      to avoid a 1 px snap on the first scroll tick (otherwise the
      inline header crosses scrollTop=-1 and the overlay pops in,
      briefly leaving a 1 px stripe of clipped inline text).
    -->
    <CoarAgendaDayHeader
      v-if="floatingHeader"
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
      <template
        v-if="$slots.dayGroupHeader"
        #default="slotProps"
      >
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
            @dblclick="props.builder.state.onEventDoubleClick?.({ event: (items[y] as AgendaEventItem<TMeta>).event, native: $event })"
          >
            <template v-if="$slots.event" #default="slotProps">
              <slot name="event" v-bind="slotProps" />
            </template>
          </CoarAgendaEvent>
        </template>
      </template>
    </VirtualizedSurface1DY>
  </div>
</template>

<style scoped>
.coar-agenda-view {
  position: relative;
  background: var(--coar-calendar-bg, #fff);
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
  /* Fill the parent container's available height. */
  height: 100%;
  overflow: hidden;
}
.coar-agenda-view__surface {
  height: 100%;
}

/* Density — compact tightens row padding + font size. The actual
   row + header CSS lives inside CoarAgendaEvent / CoarAgendaDayHeader.
   We feed the density signal via the wrapper class; their scoped
   CSS doesn't reach across the boundary, so until those children
   pick up `:density` props themselves the compact rule below is a
   no-op. Left in place to document the intent. */
</style>
