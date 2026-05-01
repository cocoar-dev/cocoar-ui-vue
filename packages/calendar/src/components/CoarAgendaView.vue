<script setup lang="ts">
/**
 * `<CoarAgendaView>` — chronological list of events grouped by day.
 *
 * Built on `VirtualizedSurface1DY` with VARIABLE item sizes, so the
 * day-header rows and the event rows can each have their natural
 * height (one-line vs. card with description). The measurement
 * cache + anchor-restoration from Spike A handle the variable
 * heights cleanly.
 *
 * Items come from the pure-function `buildAgendaItems` in
 * `core/agendaLayout`. The slot dispatches based on `item.kind`:
 *
 *   - `header` → `#dayGroupHeader` (default: locale-aware date)
 *   - `event`  → `#event` (default: time + title)
 *
 * Sticky day-headers: the inline header rows scroll naturally with
 * the list (they're absolutely positioned inside the virtual
 * spacer, so CSS `position: sticky` cannot work). To keep the
 * current day's label visible, a separate FLOATING overlay is
 * rendered as a sibling of the surface inside the wrapper. It
 * tracks `scrollTop` on the surface and shows the most recent
 * header at-or-before the topmost visible item. When the next
 * inline header scrolls into view at the very top, the overlay
 * label flips — same UX as native CSS sticky.
 */

import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watchEffect } from 'vue';
import VirtualizedSurface1DY from './VirtualizedSurface1DY.vue';
import {
  Temporal,
  buildAgendaItems,
  todayInZone,
  type AgendaItem,
  type AgendaEventItem,
  type AgendaHeaderItem,
  type CalendarEvent,
} from '../core';

interface Props {
  /** ISO date string for the visible-window start. */
  rangeStart: string;
  /** ISO date string for the visible-window end (exclusive). */
  rangeEnd: string;
  events: ReadonlyArray<CalendarEvent>;
  /** Render headers even on days with no events. Default false. */
  showEmptyDays?: boolean;
  /** Estimate for variable-size virtualization. Default 64 px. */
  estimatedItemSize?: number;
  /** Items beyond the viewport rendered each direction. Default 5. */
  overscan?: number;
  timezone?: string;
  locale?: string;
  density?: 'comfortable' | 'compact';
}

const props = withDefaults(defineProps<Props>(), {
  showEmptyDays: false,
  estimatedItemSize: 64,
  overscan: 5,
  timezone: 'UTC',
  locale: 'en-US',
  density: 'comfortable',
});

defineSlots<{
  /** Render a single event row. Default: time + title. */
  event(props: { event: CalendarEvent; item: AgendaEventItem }): unknown;
  /** Render a day-group header. Default: locale-aware date. */
  dayGroupHeader(props: { date: Temporal.PlainDate; item: AgendaHeaderItem; isToday: boolean }): unknown;
  /** Render an empty-day placeholder (when showEmptyDays). */
  emptyDay(props: { date: Temporal.PlainDate }): unknown;
}>();

const emit = defineEmits<{
  'event-click': [{ event: CalendarEvent; native: PointerEvent }];
  'date-click': [{ date: Temporal.PlainDate; native: PointerEvent }];
}>();

// ─── Items ─────────────────────────────────────────────────────────

const items = computed<AgendaItem[]>(() =>
  buildAgendaItems(props.events, {
    rangeStart: props.rangeStart,
    rangeEnd: props.rangeEnd,
    timezone: props.timezone,
    showEmptyDays: props.showEmptyDays,
  }),
);

// ─── Today ─────────────────────────────────────────────────────────

const today = ref<Temporal.PlainDate>(todayInZone(props.timezone));
watchEffect(() => {
  today.value = todayInZone(props.timezone);
});

function isToday(date: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(date, today.value) === 0;
}

// ─── Default formatters ───────────────────────────────────────────

const headerFormatter = computed(
  () =>
    new Intl.DateTimeFormat(props.locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }),
);
const timeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(props.locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: props.timezone,
    }),
);

function formatHeaderDate(iso: string): string {
  // Header dates are calendar dates (no zone); we anchor at UTC
  // midnight and format in UTC so the weekday label can never drift
  // by a day vs. the date key the agenda layout produced.
  const d = new Date(iso + 'T00:00:00Z');
  return headerFormatter.value.format(d);
}

function formatEventTime(event: CalendarEvent): string {
  // All-day events: don't show a time.
  const allDay = event.allDay === true || !event.start.includes('T');
  if (allDay) return 'All day';
  // Use Intl on a Date constructed from the start; works for Z and
  // offset-bearing strings. For unanchored datetimes we treat as
  // wall-clock UTC for the bench formatter.
  let d: Date;
  if (/[Z+-]\d{0,2}:?\d{0,2}$/.test(event.start) || /Z$/.test(event.start)) {
    d = new Date(event.start);
  } else {
    d = new Date(event.start + 'Z');
  }
  return timeFormatter.value.format(d);
}

function eventTitle(event: CalendarEvent): string {
  const meta = event.meta as { title?: unknown } | undefined;
  return typeof meta?.title === 'string' ? meta.title : '(untitled)';
}
function eventColor(event: CalendarEvent): string | undefined {
  const meta = event.meta as { color?: unknown } | undefined;
  return typeof meta?.color === 'string' ? meta.color : undefined;
}

// ─── Click handlers ───────────────────────────────────────────────

function onEventClick(e: PointerEvent, event: CalendarEvent) {
  emit('event-click', { event, native: e });
}
function onHeaderClick(e: PointerEvent, dateIso: string) {
  emit('date-click', {
    date: Temporal.PlainDate.from(dateIso),
    native: e,
  });
}

// ─── Floating sticky header (overlay) ─────────────────────────────

const surfaceRef = useTemplateRef<InstanceType<typeof VirtualizedSurface1DY>>('surface');
const scrollTop = ref(0);
let scrollEl: HTMLElement | null = null;

function onSurfaceScroll() {
  if (scrollEl) scrollTop.value = scrollEl.scrollTop;
}

onMounted(() => {
  // The surface's root element is the scrollable container
  // (`overflow-y: auto`). Attach a passive scroll listener.
  const root = (surfaceRef.value as unknown as { $el?: HTMLElement } | null)?.$el ?? null;
  if (root) {
    scrollEl = root;
    scrollEl.addEventListener('scroll', onSurfaceScroll, { passive: true });
    scrollTop.value = scrollEl.scrollTop;
  }
});
onBeforeUnmount(() => {
  if (scrollEl) {
    scrollEl.removeEventListener('scroll', onSurfaceScroll);
    scrollEl = null;
  }
});

/**
 * Sticky-overlay state — mirrors native CSS `position: sticky`'s
 * push-out behaviour:
 *   - `current` is the most-recent header at-or-before scrollTop.
 *   - `pushOffset` ≥ 0 grows when the next inline header crosses
 *     into the overlay's region; the overlay is translated up by
 *     `pushOffset` so the next header visually shoves it out.
 *   - As soon as the next header itself crosses scrollTop, the
 *     "current" pointer flips to it and `pushOffset` resets to 0.
 * This makes the swap continuous instead of a snap.
 */
const overlayHeight = ref(0);

const floatingState = computed<{
  current: AgendaHeaderItem;
  pushOffset: number;
} | null>(() => {
  // Touch scrollTop so the computed re-evaluates on scroll.
  const top = scrollTop.value;
  if (items.value.length === 0) return null;
  const surface = surfaceRef.value;
  if (!surface) return null;

  const cache = surface.getCache();
  const list = items.value;

  // Find the largest header index `i` with prefixSum(i) <= scrollTop.
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
    const gap = nextY - top; // distance from viewport-top to next header
    if (gap < overlayHeight.value) {
      pushOffset = overlayHeight.value - gap; // 0..overlayHeight
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

const overlayElRef = useTemplateRef<HTMLElement>('overlayEl');
function measureOverlay() {
  if (overlayElRef.value) overlayHeight.value = overlayElRef.value.offsetHeight;
}
watchEffect(measureOverlay);

// ─── Imperative API ───────────────────────────────────────────────

defineExpose({
  /** Snapshot of the current items list. */
  getItems: () => items.value,
  /**
   * Scroll to the first item for the given date (typically a header).
   * No-op if the date is not in the current items.
   */
  scrollToDate(dateIso: string): void {
    const idx = items.value.findIndex((it) => it.kind === 'header' && it.date === dateIso);
    if (idx >= 0) surfaceRef.value?.scrollToIndex(idx);
  },
});
</script>

<template>
  <div
    class="coar-agenda-view"
    :class="[`coar-agenda-view--density-${density}`]"
  >
    <!--
      Floating sticky header. Sits above the surface as an absolute
      overlay; only visible once the user has scrolled past the
      first inline header (scrollTop > 0). When the next inline
      header crosses the top of the viewport, the label flips.
    -->
    <!--
      Overlay is rendered even at scrollTop=0. At rest, it visually
      coincides with the first inline header — same class, same
      content, same position. Hiding it at the top edge would create
      a 1 px snap on the very first scroll tick: the inline header
      moves to top:-1 and the overlay pops in, briefly leaving a 1
      px stripe of clipped inline text peeking out the top.
    -->
    <div
      v-if="floatingHeader"
      ref="overlayEl"
      class="coar-agenda-view__sticky-header coar-agenda-view__header"
      :class="{
        'coar-agenda-view__header--today': isToday(
          Temporal.PlainDate.from(floatingHeader.date),
        ),
        'coar-agenda-view__header--empty': floatingHeader.isEmpty,
      }"
      :style="{ transform: floatingTransform }"
      @pointerdown="onHeaderClick($event, floatingHeader.date)"
    >
      <slot
        name="dayGroupHeader"
        :date="Temporal.PlainDate.from(floatingHeader.date)"
        :item="floatingHeader"
        :is-today="isToday(Temporal.PlainDate.from(floatingHeader.date))"
      >
        <span class="coar-agenda-view__header-label">
          {{ formatHeaderDate(floatingHeader.date) }}
        </span>
        <span
          v-if="isToday(Temporal.PlainDate.from(floatingHeader.date))"
          class="coar-agenda-view__header-today"
        >today</span>
      </slot>
    </div>

  <VirtualizedSurface1DY
    ref="surface"
    :item-count="items.length"
    :estimated-item-size="estimatedItemSize"
    :overscan="overscan"
    class="coar-agenda-view__surface"
  >
    <template #item="{ y }">
      <!--
        items[y] is a tagged union; v-if dispatches by kind. The
        sticky-header behaviour comes from `position: sticky` on
        the header row class, scoped to the virtual surface (the
        nearest scroll ancestor with overflow-y: auto).
      -->
      <template v-if="items[y].kind === 'header'">
        <div
          class="coar-agenda-view__header"
          :class="{
            'coar-agenda-view__header--today': isToday(
              Temporal.PlainDate.from((items[y] as AgendaHeaderItem).date),
            ),
            'coar-agenda-view__header--empty': (items[y] as AgendaHeaderItem).isEmpty,
          }"
          @pointerdown="onHeaderClick($event, (items[y] as AgendaHeaderItem).date)"
        >
          <slot
            name="dayGroupHeader"
            :date="Temporal.PlainDate.from((items[y] as AgendaHeaderItem).date)"
            :item="items[y] as AgendaHeaderItem"
            :is-today="isToday(Temporal.PlainDate.from((items[y] as AgendaHeaderItem).date))"
          >
            <span class="coar-agenda-view__header-label">
              {{ formatHeaderDate((items[y] as AgendaHeaderItem).date) }}
            </span>
            <span
              v-if="isToday(Temporal.PlainDate.from((items[y] as AgendaHeaderItem).date))"
              class="coar-agenda-view__header-today"
            >today</span>
          </slot>
        </div>
      </template>

      <template v-else>
        <template v-if="(items[y] as AgendaEventItem).isContinuation && false">
          <!-- isContinuation rows hidden by default — comment is a placeholder for
               consumers who want to filter them via a future prop. -->
        </template>
        <div
          class="coar-agenda-view__row"
          :class="{
            'coar-agenda-view__row--continuation': (items[y] as AgendaEventItem).isContinuation,
          }"
          @pointerdown="onEventClick($event, (items[y] as AgendaEventItem).event)"
        >
          <slot
            name="event"
            :event="(items[y] as AgendaEventItem).event"
            :item="items[y] as AgendaEventItem"
          >
            <div class="coar-agenda-view__row-default">
              <span
                class="coar-agenda-view__row-color"
                :style="{
                  background: eventColor((items[y] as AgendaEventItem).event)
                    ?? 'var(--coar-color-accent, #2563eb)',
                }"
              />
              <span class="coar-agenda-view__row-time">
                {{ formatEventTime((items[y] as AgendaEventItem).event) }}
              </span>
              <span class="coar-agenda-view__row-title">
                {{ eventTitle((items[y] as AgendaEventItem).event) }}
                <span
                  v-if="(items[y] as AgendaEventItem).isContinuation"
                  class="coar-agenda-view__row-continuation-tag"
                >(cont.)</span>
              </span>
            </div>
          </slot>
        </div>
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

.coar-agenda-view__sticky-header {
  /* Floating overlay above the surface — outside the absolute-positioned
     virtual items, so it doesn't scroll with them. Pointer events still
     work for date-click.
     `will-change: transform` keeps the overlay on its own compositor
     layer so the per-frame translateY (during the push-out) doesn't
     trigger a paint or layout. */
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  /* Reserve space on the right for the surface's scrollbar so the
     overlay doesn't overlap it. 14px is roughly Chrome's overlay/
     classic scrollbar width; harmless on touch devices. */
  margin-right: 14px;
  will-change: transform;
  /* No box-shadow here — `.coar-agenda-view__header` already
     contributes a 1 px border-bottom, and stacking both produces a
     visible 1-2 px line discontinuity right at the swap moment
     (the overlay's border-bottom briefly appears above the inline
     next-day header's border-bottom). */
}

.coar-agenda-view__header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 16px;
  background: var(--coar-calendar-bg, #fff);
  border-bottom: 1px solid var(--coar-calendar-border, #e3e5e9);
  font-weight: 600;
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-base, #1a1c1f);
}
.coar-agenda-view__header--today {
  color: var(--coar-color-accent, #2563eb);
}
.coar-agenda-view__header--empty {
  color: var(--coar-text-subtle, #9ca3af);
  font-style: italic;
}
.coar-agenda-view__header-today {
  font-size: var(--coar-font-size-xs, 11px);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--coar-color-accent, #2563eb);
  color: #fff;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 700;
}

.coar-agenda-view__row {
  padding: 10px 16px;
  border-bottom: 1px solid var(--coar-calendar-border, #f3f4f6);
  cursor: pointer;
  user-select: none;
  background: var(--coar-calendar-bg, #fff);
  transition: background-color 80ms ease;
}
.coar-agenda-view__row:hover {
  background: var(--coar-surface-subtle, #f6f7f9);
}
.coar-agenda-view__row--continuation {
  opacity: 0.7;
}

.coar-agenda-view__row-default {
  display: flex;
  align-items: center;
  gap: 12px;
}
.coar-agenda-view__row-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.coar-agenda-view__row-time {
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-subtle, #6c7280);
  min-width: 80px;
  font-variant-numeric: tabular-nums;
}
.coar-agenda-view__row-title {
  font-size: var(--coar-font-size-base, 14px);
  color: var(--coar-text-base, #1a1c1f);
  font-weight: 500;
}
.coar-agenda-view__row-continuation-tag {
  margin-left: 6px;
  font-size: var(--coar-font-size-xs, 11px);
  color: var(--coar-text-subtle, #9ca3af);
  font-style: italic;
  font-weight: 400;
}

/* Density — compact tightens row padding + font size. */
.coar-agenda-view--density-compact .coar-agenda-view__row {
  padding: 6px 16px;
}
.coar-agenda-view--density-compact .coar-agenda-view__header {
  padding: 4px 16px;
}
</style>
