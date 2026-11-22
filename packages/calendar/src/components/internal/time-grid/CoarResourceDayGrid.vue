<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarResourceDayGrid>` — one day with an hour column per resource.
 *
 * A separate surface rather than a mode of `<CoarTimeGrid>`: there a
 * column is a day throughout (drag axis, selection, neighbour pages),
 * here an event can span columns and appear in several blocks. Colours
 * and labels come from the same `useTimeGridPresentation`, drops from
 * the same pipeline (C2).
 *
 * Lives in `internal/` — rendered by the day view when the builder has
 * resources.
 */

import { computed, onBeforeUnmount, ref, shallowRef, toValue, useTemplateRef } from 'vue';
import {
  Temporal,
  UNASSIGNED_RESOURCE,
  isAllDayEvent,
  layoutResourceDay,
  type AllDayBar,
  type CalendarEvent,
  type CalendarResource,
  type PositionedEvent,
  type ResourceAllDayBlock,
  type ResourceBlock,
} from '../../../core';
import { DstResolutionError, buildDropPayload } from '../../../core/dnd/move-math';
import { CalendarBuilder } from '../../../builders/calendar-builder';
import type { CalendarDayOverlay, EventDropPayload } from '../../../builders/types';
import { afterFollowingClick, onSurfacePointerdown, TAP_SLOP_PX } from '../../../composables/surfaceTap';
import { useCoarDrag } from '../../../composables/useCoarDrag';
import { usePageSwipe } from '../../../composables/usePageSwipe';
import { useTimeGridPresentation } from '../../../composables/useTimeGridPresentation';
import { LONG_PRESS_MS } from '../../../composables/useTimeSelection';
import { originatesFromEvent } from '../originatesFromEvent';
import CoarTimeGridNowMarker from './CoarTimeGridNowMarker.vue';

const props = defineProps<{
  builder: CalendarBuilder<TMeta>;
  date: Temporal.PlainDate;
}>();

defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  allDayEvent?(props: { event: CalendarEvent<TMeta>; layout: AllDayBar<TMeta> }): unknown;
  resourceHeader?(props: { resource: CalendarResource | null; id: string }): unknown;
  overlay?(props: { overlay: CalendarDayOverlay }): unknown;
}>();

const state = computed(() => {
  const s = props.builder.state;
  const range = toValue(s.timeRange);
  return {
    timezone: toValue(s.timezone),
    locale: toValue(s.locale),
    dateStyle: toValue(s.dateStyle),
    timeStyle: toValue(s.timeStyle),
    hour12: toValue(s.hour12),
    eventTextContrast: toValue(s.eventTextContrast),
    timeRange: [Math.floor(range.startMinutes / 60), Math.ceil(range.endMinutes / 60)] as const,
    pixelsPerHour: toValue(s.pixelsPerHour),
    slotDuration: toValue(s.slotDuration) as number,
    resources: toValue(s.resources),
  };
});
const timeRange = computed(() => state.value.timeRange);
const timezone = computed(() => state.value.timezone);
const pph = computed(() => state.value.pixelsPerHour);
const heightPx = computed(() => (timeRange.value[1] - timeRange.value[0]) * pph.value);

const {
  t,
  isToday,
  hourLabels,
  nowMinutesFromGridStart,
  cardTimeLabel,
  eventTitle,
  eventBgFor,
  eventBorderFor,
  eventInkFor,
  eventAriaLabel,
} = useTimeGridPresentation<TMeta>({ state, timeRange });

const layout = computed(() =>
  layoutResourceDay(props.builder.api.getVisibleEvents(), {
    day: props.date,
    resources: state.value.resources.map((r) => r.id),
    resourcesOf: (event) => props.builder.state.eventResources?.(event) ?? [],
    timeRange: timeRange.value,
    timezone: timezone.value,
  }),
);
const columnCount = computed(() => layout.value.columns.length);
const resourceById = computed(() => new Map(state.value.resources.map((r) => [r.id, r])));
const headerLabel = (id: string) =>
  id === UNASSIGNED_RESOURCE
    ? t('coar.calendar.resources.unassigned', undefined, 'Unassigned')
    : (resourceById.value.get(id)?.label ?? id);

function blockFrame(block: { startCol: number; endCol: number; lane: number; laneCount: number }) {
  const column = 100 / columnCount.value;
  const span = block.endCol - block.startCol + 1;
  const left = (block.startCol + block.lane / block.laneCount) * column;
  return { left: `calc(${left}% + 2px)`, width: `calc(${(span / block.laneCount) * column}% - 4px)` };
}
const px = (minutes: number) => (minutes / 60) * pph.value;

function eventVars(event: CalendarEvent<TMeta>): Record<string, string> {
  return {
    '--event-bg': eventBgFor(event),
    '--event-border': eventBorderFor(event),
    '--event-border-left': `3px solid ${eventBorderFor(event)}`,
    '--event-ink': eventInkFor(event),
  };
}
function blockStyle(block: ResourceBlock<TMeta>) {
  return {
    ...eventVars(block.event),
    ...blockFrame(block),
    top: `${px(block.startMinutes)}px`,
    height: `${Math.max(16, px(block.endMinutes - block.startMinutes))}px`,
    zIndex: block.lane + 2,
  };
}
const ALL_DAY_LANE = 22;
function allDayStyle(block: ResourceAllDayBlock<TMeta>) {
  return {
    ...eventVars(block.event),
    ...blockFrame({ ...block, lane: 0, laneCount: 1 }),
    top: `${2 + block.lane * ALL_DAY_LANE}px`,
    height: `${ALL_DAY_LANE - 2}px`,
  };
}

// ─── Overlays across all columns ─────────────────────────────────────

const overlays = computed(() => {
  const fn = props.builder.state.dayOverlays;
  if (!fn) return [];
  const [startHour, endHour] = timeRange.value;
  const dayStart = instantOf(props.date, startHour * 60);
  const dayEnd = instantOf(props.date, endHour * 60);
  return fn(props.date).flatMap((overlay) => {
    const start = Math.max(overlay.start.epochMilliseconds, dayStart);
    const end = Math.min(overlay.end.epochMilliseconds, dayEnd);
    if (end <= start) return [];
    return [{ overlay, top: wallMinutes(start), height: (end - start) / 60_000 }];
  });
});
function zonedAt(date: Temporal.PlainDate, minutes: number): Temporal.ZonedDateTime {
  const days = Math.floor(minutes / 1440);
  const rest = minutes - days * 1440;
  return date.add({ days }).toZonedDateTime({
    timeZone: timezone.value,
    plainTime: new Temporal.PlainTime(Math.floor(rest / 60), rest % 60),
  });
}
const instantOf = (date: Temporal.PlainDate, minutes: number) =>
  zonedAt(date, minutes).epochMilliseconds;
function wallMinutes(epoch: number): number {
  const z = Temporal.Instant.fromEpochMilliseconds(epoch).toZonedDateTimeISO(timezone.value);
  return z.hour * 60 + z.minute - timeRange.value[0] * 60;
}

// ─── Hit test ────────────────────────────────────────────────────────

const rootEl = useTemplateRef<HTMLElement>('rootEl');
const columnsEl = useTemplateRef<HTMLElement>('columnsEl');

function columnAt(x: number): number | null {
  const rect = columnsEl.value?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || x < rect.left || x >= rect.right) return null;
  return Math.floor(((x - rect.left) / rect.width) * columnCount.value);
}
/** Minute of the day at a height, snapped to the slot. */
function minuteAt(y: number, offsetMinutes = 0): number {
  const rect = columnsEl.value?.getBoundingClientRect();
  const slot = state.value.slotDuration;
  const raw = ((y - (rect?.top ?? 0)) / pph.value) * 60 - offsetMinutes;
  const snapped = Math.round(raw / slot) * slot + timeRange.value[0] * 60;
  return Math.max(timeRange.value[0] * 60, Math.min(timeRange.value[1] * 60 - slot, snapped));
}
const resourceIdAt = (col: number) => {
  const id = layout.value.columns[col];
  return id === UNASSIGNED_RESOURCE ? undefined : id;
};

// ─── Moving events ───────────────────────────────────────────────────

interface DragData {
  event: CalendarEvent<TMeta>;
  sourceCol: number;
  grabMinutes: number;
  native: PointerEvent;
}
const dragged = shallowRef<string | null>(null);
const drop = shallowRef<{ col: number; minutes: number | null; valid: boolean } | null>(null);

function resolveDrop(data: DragData, x: number, y: number) {
  const col = columnAt(x);
  if (col === null) return null;
  const allDay = isAllDayEvent(data.event);
  const minutes = allDay ? null : minuteAt(y, data.grabMinutes);
  const canDrop = props.builder.state.canDrop;
  const valid = canDrop
    ? canDrop(data.event, {
        date: props.date.toString(),
        minutes,
        displayZone: timezone.value,
        resourceId: resourceIdAt(col),
      })
    : true;
  return { col, minutes, valid };
}

const eventDrag = useCoarDrag<DragData>({
  surfaceRef: rootEl,
  autoScroll: null,
  dragThreshold: 5,
  onDragMove: (ctx) => {
    dragged.value = ctx.data.event.id;
    drop.value = resolveDrop(ctx.data, ctx.pointer.x, ctx.pointer.y);
  },
  onDragEnd: (ctx) => {
    const { data } = ctx;
    if (!ctx.crossedThreshold) {
      const click = () => props.builder.state.onEventClick?.({ event: data.event, native: data.native });
      if (data.native.pointerType === 'touch' || data.native.pointerType === 'pen') {
        afterFollowingClick(click);
      } else click();
      return;
    }
    const landed = resolveDrop(data, ctx.pointer.x, ctx.pointer.y);
    dragged.value = null;
    drop.value = null;
    if (!landed?.valid) return;
    try {
      const payload = buildDropPayload(
        toValue(props.builder.state.dstPolicy),
        data.event,
        {
          start: data.event.start,
          ...(data.event.end !== undefined ? { end: data.event.end } : {}),
          displayZone: timezone.value,
        },
        {
          date: dropDate(data),
          minutes: landed.minutes,
          displayZone: timezone.value,
          valid: true,
          resourceId: resourceIdAt(landed.col),
          sourceResourceId: resourceIdAt(data.sourceCol),
        },
        isAllDayEvent(data.event) ? 'allDay' : 'timed',
        data.native,
      );
      props.builder.state.onEventDrop?.(payload as unknown as EventDropPayload<TMeta>);
    } catch (error) {
      if (!(error instanceof DstResolutionError)) throw error;
    }
  },
  onDragCancel: () => {
    dragged.value = null;
    drop.value = null;
  },
});

/** An all-day event keeps its own start; the grid shows one day of it. */
function dropDate(data: DragData): string {
  return isAllDayEvent(data.event) ? data.event.start.toString() : props.date.toString();
}

function onBlockPointerdown(e: PointerEvent, block: ResourceBlock<TMeta>): void {
  const rect = columnsEl.value?.getBoundingClientRect();
  const atPointer = ((e.clientY - (rect?.top ?? 0)) / pph.value) * 60;
  const sourceCol = columnAt(e.clientX) ?? block.startCol;
  eventDrag.startDrag({
    event: block.event,
    sourceCol: Math.max(block.startCol, Math.min(block.endCol, sourceCol)),
    grabMinutes: Number.isFinite(atPointer) ? atPointer - block.startMinutes : 0,
    native: e,
  })(e);
}
function onAllDayPointerdown(e: PointerEvent, block: ResourceAllDayBlock<TMeta>): void {
  const sourceCol = columnAt(e.clientX) ?? block.startCol;
  eventDrag.startDrag({
    event: block.event,
    sourceCol: Math.max(block.startCol, Math.min(block.endCol, sourceCol)),
    grabMinutes: 0,
    native: e,
  })(e);
}

// ─── Empty column: click and range ───────────────────────────────────

const selection = ref<{ col: number; from: number; to: number } | null>(null);
let stopSelecting: (() => void) | null = null;
const blockScroll = (e: Event) => e.preventDefault();

function clickAt(col: number, minutes: number, native: PointerEvent): void {
  const day = props.date;
  const time = new Temporal.PlainTime(Math.floor(minutes / 60), minutes % 60);
  props.builder.state.onTimeClick?.({ date: day, time, native, resourceId: resourceIdAt(col) });
}

function onColumnPointerdown(e: PointerEvent): void {
  if (originatesFromEvent(e)) return;
  const col = columnAt(e.clientX);
  if (col === null) return;
  const minutes = minuteAt(e.clientY);
  if (!toValue(props.builder.state.timeRangeSelect) || e.button !== 0) {
    onSurfacePointerdown(e, () => clickAt(col, minutes, e));
    return;
  }
  stopSelecting?.();
  const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
  const id = e.pointerId;
  const startX = e.clientX;
  const startY = e.clientY;
  const slot = state.value.slotDuration;
  let selecting = !touch;
  let moved = false;
  if (selecting) selection.value = { col, from: minutes, to: minutes + slot };
  const timer = touch
    ? setTimeout(() => {
        selecting = true;
        swipe.release(id);
        selection.value = { col, from: minutes, to: minutes + slot };
        document.addEventListener('touchmove', blockScroll, { passive: false });
      }, LONG_PRESS_MS)
    : null;
  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    if (Math.abs(ev.clientX - startX) > TAP_SLOP_PX || Math.abs(ev.clientY - startY) > TAP_SLOP_PX) {
      moved = true;
      if (!selecting && timer !== null) clearTimeout(timer);
    }
    if (!selecting) return;
    const at = minuteAt(ev.clientY);
    selection.value =
      at >= minutes ? { col, from: minutes, to: at + slot } : { col, from: at, to: minutes + slot };
  };
  const stop = () => {
    if (timer !== null) clearTimeout(timer);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    document.removeEventListener('touchmove', blockScroll);
    stopSelecting = null;
    selection.value = null;
  };
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    const range = selection.value;
    const wasSelecting = selecting;
    stop();
    if (wasSelecting && range) {
      props.builder.state.onTimeRangeSelect?.({
        date: props.date,
        start: zonedAt(props.date, range.from),
        end: zonedAt(props.date, range.to),
        source: moved ? 'drag' : 'click',
        native: moved ? ev : e,
        resourceId: resourceIdAt(col),
      });
      if (!moved) clickAt(col, minutes, e);
      return;
    }
    if (!moved) afterFollowingClick(() => clickAt(col, minutes, e));
  };
  const cancel = (ev: PointerEvent) => {
    if (ev.pointerId === id) stop();
  };
  stopSelecting = stop;
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
}
onBeforeUnmount(() => stopSelecting?.());

// ─── Paging ──────────────────────────────────────────────────────────

const swipe = usePageSwipe({
  pageEl: columnsEl,
  enabled: () =>
    toValue(props.builder.state.swipeNavigation) &&
    !eventDrag.isDragging.value &&
    selection.value === null,
  offsetVar: '--coar-resource-day-swipe-x',
  onCommit: (direction) => {
    if (direction === 1) props.builder.api.next();
    else props.builder.api.prev();
  },
});
function onBodyPointerdown(e: PointerEvent): void {
  if (!originatesFromEvent(e)) swipe.onPointerdown(e);
}

defineExpose({ getLayout: () => layout.value });
</script>

<template>
  <div
    ref="rootEl"
    class="coar-resource-day"
    :class="{ 'coar-resource-day--settling': swipe.settling.value }"
    :style="{ '--coar-i-resource-columns': columnCount, ...swipe.swipeStyle.value }"
    role="region"
    :aria-label="t('coar.calendar.timegrid.dayLabel', undefined, 'Day view')"
    :data-resource-count="columnCount"
  >
    <div class="coar-resource-day__top">
      <div class="coar-resource-day__header">
        <div class="coar-resource-day__axis" />
        <div class="coar-resource-day__grid">
          <div
            v-for="id in layout.columns"
            :key="id"
            class="coar-resource-day__resource"
            :data-resource-id="id"
          >
            <slot :id="id" name="resourceHeader" :resource="resourceById.get(id) ?? null">
              {{ headerLabel(id) }}
            </slot>
          </div>
        </div>
      </div>
      <div v-if="layout.allDayLaneCount > 0" class="coar-resource-day__all-day">
        <div class="coar-resource-day__axis coar-resource-day__axis--label">
          {{ t('coar.calendar.timegrid.allDay', undefined, 'all-day') }}
        </div>
        <div
          class="coar-resource-day__band"
          :style="{ height: `${layout.allDayLaneCount * ALL_DAY_LANE + 4}px` }"
        >
          <div
            v-for="block in layout.allDay"
            :key="block.key"
            class="coar-resource-day__block coar-resource-day__block--all-day"
            :class="{ 'coar-resource-day__block--dragging': dragged === block.event.id }"
            :style="allDayStyle(block)"
            :data-event-id="block.event.id"
            tabindex="0"
            role="button"
            :aria-label="eventAriaLabel(block.event)"
            @pointerdown="onAllDayPointerdown($event, block)"
          >
            <slot name="allDayEvent" :event="block.event" :layout="block">
              <span class="coar-resource-day__title">{{ eventTitle(block.event) }}</span>
            </slot>
          </div>
        </div>
      </div>
    </div>

    <div class="coar-resource-day__body" :style="{ height: `${heightPx}px` }">
      <div class="coar-resource-day__axis coar-resource-day__hours">
        <div
          v-for="entry in hourLabels"
          :key="entry.hour"
          class="coar-resource-day__hour"
          :data-hour="entry.hour"
          :style="{ top: `${px((entry.hour - timeRange[0]) * 60)}px` }"
        >
          {{ entry.label }}
        </div>
      </div>
      <div
        ref="columnsEl"
        class="coar-resource-day__columns"
        :style="{ '--coar-i-hour': `${pph}px` }"
        @pointerdown="onColumnPointerdown($event); onBodyPointerdown($event)"
      >
        <div
          v-for="(id, col) in layout.columns"
          :key="id"
          class="coar-resource-day__column"
          :class="{
            'coar-resource-day__column--drop': drop?.col === col && drop.valid,
            'coar-resource-day__column--drop-invalid': drop?.col === col && !drop.valid,
          }"
          :style="{ left: `${(col / columnCount) * 100}%`, width: `${100 / columnCount}%` }"
        />

        <div
          v-for="entry in overlays"
          :key="entry.overlay.key"
          class="coar-resource-day__overlay"
          :style="{ top: `${px(entry.top)}px`, height: `${px(entry.height)}px` }"
          :data-overlay-key="entry.overlay.key"
        >
          <slot name="overlay" :overlay="entry.overlay">{{ entry.overlay.label }}</slot>
        </div>

        <div
          v-if="selection"
          class="coar-resource-day__selection"
          :style="{
            left: `${(selection.col / columnCount) * 100}%`,
            width: `${100 / columnCount}%`,
            top: `${px(selection.from - timeRange[0] * 60)}px`,
            height: `${px(selection.to - selection.from)}px`,
          }"
        />

        <div
          v-for="block in layout.blocks"
          :key="block.key"
          class="coar-resource-day__block"
          :class="{ 'coar-resource-day__block--dragging': dragged === block.event.id }"
          :style="blockStyle(block)"
          :data-event-id="block.event.id"
          tabindex="0"
          role="button"
          :aria-label="eventAriaLabel(block.event)"
          @pointerdown="onBlockPointerdown($event, block)"
        >
          <slot name="event" :event="block.event" :layout="block">
            <span class="coar-resource-day__title">{{ eventTitle(block.event) }}</span>
            <span class="coar-resource-day__time">{{ cardTimeLabel(block.event) }}</span>
          </slot>
        </div>

        <CoarTimeGridNowMarker
          v-if="isToday(date) && nowMinutesFromGridStart !== null"
          :top-px="px(nowMinutesFromGridStart)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-resource-day {
  overflow-x: clip;
  background: var(--coar-calendar-bg, #fff);
  color: var(--coar-text-base, #1a1c1f);
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
  font-size: var(--coar-calendar-event-font-size, var(--coar-font-size-xs, 11px));
}
.coar-resource-day__top {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--coar-calendar-bg, #fff);
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-resource-day__header,
.coar-resource-day__all-day,
.coar-resource-day__body {
  display: grid;
  grid-template-columns: var(--coar-time-grid-axis-width, 80px) minmax(0, 1fr);
}
.coar-resource-day__grid {
  display: grid;
  grid-template-columns: repeat(var(--coar-i-resource-columns), minmax(0, 1fr));
}
.coar-resource-day__resource {
  min-width: 0;
  padding: var(--coar-calendar-header-cell-padding, 8px 12px);
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  text-align: center;
  font-weight: var(--coar-calendar-label-font-weight, 600);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.coar-resource-day__axis--label {
  padding: 4px 8px;
  text-align: right;
  color: var(--coar-text-subtle, #6c7280);
}
.coar-resource-day__band {
  position: relative;
  border-top: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-resource-day__body {
  position: relative;
}
.coar-resource-day__hours {
  position: relative;
}
.coar-resource-day__hour {
  position: absolute;
  right: 8px;
  transform: translateY(-50%);
  color: var(--coar-text-subtle, #6c7280);
}
.coar-resource-day__hour:first-child {
  transform: none;
}
.coar-resource-day__columns {
  position: relative;
  touch-action: pan-y;
  transform: translate3d(var(--coar-resource-day-swipe-x, 0px), 0, 0);
  background-image: repeating-linear-gradient(
    to bottom,
    var(--coar-calendar-grid-line, #e3e5e9) 0,
    var(--coar-calendar-grid-line, #e3e5e9) 1px,
    transparent 1px,
    transparent var(--coar-i-hour)
  );
}
.coar-resource-day--settling .coar-resource-day__columns {
  transition: transform 180ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .coar-resource-day--settling .coar-resource-day__columns {
    transition: none;
  }
}
.coar-resource-day__column {
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  box-sizing: border-box;
  pointer-events: none;
}
.coar-resource-day__column--drop {
  background: color-mix(in srgb, var(--coar-calendar-selection-color, var(--coar-background-accent-primary, #2563eb)) 14%, transparent);
}
.coar-resource-day__column--drop-invalid {
  background: var(--coar-calendar-invalid-stripe, rgba(220, 38, 38, 0.18));
}
.coar-resource-day__overlay {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 1;
  overflow: hidden;
  box-sizing: border-box;
  padding: 2px 6px;
  background: color-mix(in srgb, var(--coar-calendar-band-tint, #2563eb) 10%, transparent);
}
.coar-resource-day__selection {
  position: absolute;
  z-index: 1;
  box-sizing: border-box;
  border: 1px solid var(--coar-calendar-selection-border-color, color-mix( in srgb, var(--coar-calendar-selection-color, var(--coar-background-accent-primary, #2563eb)) 55%, transparent ));
  background: color-mix(in srgb, var(--coar-calendar-selection-color, var(--coar-background-accent-primary, #2563eb)) 14%, transparent);
  pointer-events: none;
}
.coar-resource-day__block {
  position: absolute;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: var(--coar-calendar-event-padding, 2px 6px);
  border-left: var(--coar-calendar-event-border-left, 3px solid var(--event-border));
  border-radius: var(--coar-calendar-event-radius, 3px);
  background: var(--coar-calendar-event-surface-bg, var(--event-bg));
  color: var(--event-ink, var(--coar-text-base, #1a1c1f));
  cursor: pointer;
  user-select: none;
  /* A touch on an event is a drag, as everywhere in the calendar. */
  touch-action: none;
}
.coar-resource-day__block--all-day {
  flex-direction: row;
  align-items: center;
  white-space: nowrap;
}
.coar-resource-day__block--dragging {
  opacity: 0.4;
}
.coar-resource-day__block:focus-visible {
  outline: 2px solid var(--coar-calendar-focus-color, var(--coar-color-focus, #2563eb));
  outline-offset: 1px;
}
.coar-resource-day__title {
  /* A short block keeps its title; the time below it is what gets clipped. */
  flex: 0 0 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: var(--coar-calendar-event-title-font-weight, 600);
}
.coar-resource-day__time {
  opacity: var(--coar-calendar-event-meta-opacity, 0.8);
}
</style>
