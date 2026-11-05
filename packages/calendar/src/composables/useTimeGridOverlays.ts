/**
 * `useTimeGridOverlays` — what the time grids draw besides events:
 * the host's background bands (`builder.backgrounds`) and draft
 * (`builder.draft`), resolved per visible day into minutes of the day.
 *
 * Axis-free, shared by `<CoarTimeGrid>` (days as columns) and
 * `<CoarTimeRows>` (days as rows); the components turn minutes into
 * pixels along their own axis.
 *
 * Internal — not exported from the package barrel.
 */

import { computed, toValue, type ComputedRef } from 'vue';
import { Temporal, layoutDayEvents, type CalendarEvent } from '../core';
import type { CalendarBuilder } from '../builders/calendar-builder';
import type { CalendarBand, CalendarDraft, CalendarDraftSegment } from '../builders/types';

/** A mark on the time axis (`<CoarTimeAxisMarker>`). */
export type TimeAxisMark =
  | { type: 'time'; px: number; label: string }
  | {
      type: 'range';
      startPx: number;
      endPx: number;
      startLabel: string;
      endLabel: string;
      durationLabel: string;
      /** `'selection'` while dragging, `'draft'` for the host's draft. */
      tone: 'selection' | 'draft';
    };

/** A band resolved for one day, minutes of the day clipped to the visible range. */
export type ResolvedBand =
  | {
      type: 'range';
      key: string;
      kind: string;
      start: number;
      end: number;
      appearance: 'tint' | 'hatch' | 'outline';
      layer: 'below' | 'above';
      color?: string;
      label?: string;
    }
  | { type: 'line'; key: string; kind: string; at: number; color?: string; label?: string };

export interface UseTimeGridOverlaysOptions<TMeta extends Record<string, unknown>> {
  builder: CalendarBuilder<TMeta>;
  days: ComputedRef<ReadonlyArray<Temporal.PlainDate>>;
  /** `[startHour, endHour]` of the rendered range. */
  timeRange: ComputedRef<readonly [number, number]>;
  timezone: ComputedRef<string>;
}

const minuteOf = (t: Temporal.PlainTime) => t.hour * 60 + t.minute;

function resolveBands(
  bands: ReadonlyArray<CalendarBand>,
  from: number,
  to: number,
): ResolvedBand[] {
  const out: ResolvedBand[] = [];
  bands.forEach((band, i) => {
    const key = `${i}-${band.kind}`;
    if ('at' in band) {
      const at = minuteOf(band.at);
      if (at < from || at > to) return;
      out.push({ type: 'line', key, kind: band.kind, at, color: band.color, label: band.label });
      return;
    }
    const start = Math.max(from, minuteOf(band.start));
    const rawEnd = minuteOf(band.end);
    const end = Math.min(to, rawEnd === 0 ? 24 * 60 : rawEnd);
    if (end <= start) return;
    out.push({
      type: 'range',
      key,
      kind: band.kind,
      start,
      end,
      appearance: band.appearance ?? 'tint',
      layer: band.layer ?? 'below',
      color: band.color,
      label: band.label,
    });
  });
  return out;
}

export function useTimeGridOverlays<TMeta extends Record<string, unknown>>(
  opts: UseTimeGridOverlaysOptions<TMeta>,
) {
  const rangeMinutes = computed(() => ({
    from: opts.timeRange.value[0] * 60,
    to: opts.timeRange.value[1] * 60,
  }));

  /** Bands per day key. `backgrounds` is read here on every render (C7). */
  const bandsByDay = computed(() => {
    const fn = opts.builder.state.backgrounds;
    const out = new Map<string, ResolvedBand[]>();
    if (!fn) return out;
    const { from, to } = rangeMinutes.value;
    for (const day of opts.days.value) {
      const bands = fn(day);
      if (bands && bands.length > 0) out.set(day.toString(), resolveBands(bands, from, to));
    }
    return out;
  });
  function bandsFor(date: Temporal.PlainDate): ResolvedBand[] {
    return bandsByDay.value.get(date.toString()) ?? [];
  }

  const draft = computed<CalendarDraft | null>(() => {
    const d = toValue(opts.builder.state.draft);
    if (!d || Temporal.ZonedDateTime.compare(d.end, d.start) <= 0) return null;
    return d;
  });

  /**
   * The draft's piece on each visible day, projected like an event
   * (display zone, clipped to `timeRange`, split at midnight).
   */
  const draftByDay = computed(() => {
    const out = new Map<string, CalendarDraftSegment>();
    const d = draft.value;
    if (!d) return out;
    const probe = { id: '__draft__', start: d.start, end: d.end } as CalendarEvent;
    const startHour = opts.timeRange.value[0];
    for (const day of opts.days.value) {
      const [p] = layoutDayEvents([probe], {
        day,
        timeRange: opts.timeRange.value,
        timezone: opts.timezone.value,
      });
      if (!p) continue;
      out.set(day.toString(), {
        start: d.start,
        end: d.end,
        date: day,
        startMinutes: startHour * 60 + p.startMinutes,
        endMinutes: startHour * 60 + p.endMinutes,
        clippedStart: p.clippedTop,
        clippedEnd: p.clippedBottom,
      });
    }
    return out;
  });
  function draftFor(date: Temporal.PlainDate): CalendarDraftSegment | null {
    return draftByDay.value.get(date.toString()) ?? null;
  }

  return { bandsFor, draft, draftFor };
}

export interface AxisMarkInput {
  /** The range being dragged, minutes of the day. */
  drag: { start: number; end: number } | null;
  /** The snapped time under the pointer (`hoverIndicator`). */
  hoverMinute: number | null;
  draft: CalendarDraft | null;
  /** The draft's pieces on the visible days, in day order. */
  draftSegments: ReadonlyArray<CalendarDraftSegment>;
  timezone: string;
  /** Pixel offset along the time axis of a minute of the day. */
  toPx: (minuteOfDay: number) => number;
  formatClock: (minuteOfDay: number) => string;
  formatDuration: (minutes: number) => string;
}

/**
 * What the time axis shows: a dragged range first, else the time under
 * the pointer, else the draft — so the draft's times come back as soon
 * as the pointer leaves the grid.
 */
export function timeAxisMark(input: AxisMarkInput): TimeAxisMark | null {
  const { toPx, formatClock, formatDuration } = input;
  if (input.drag) {
    const { start, end } = input.drag;
    return {
      type: 'range',
      tone: 'selection',
      startPx: toPx(start),
      endPx: toPx(end),
      startLabel: formatClock(start),
      endLabel: formatClock(end),
      durationLabel: formatDuration(end - start),
    };
  }
  if (input.hoverMinute !== null) {
    return { type: 'time', px: toPx(input.hoverMinute), label: formatClock(input.hoverMinute) };
  }
  const d = input.draft;
  const first = input.draftSegments[0];
  const last = input.draftSegments[input.draftSegments.length - 1];
  if (!d || !first || !last) return null;
  const start = d.start.withTimeZone(input.timezone);
  const end = d.end.withTimeZone(input.timezone);
  return {
    type: 'range',
    tone: 'draft',
    startPx: toPx(first.startMinutes),
    endPx: toPx(last.endMinutes),
    startLabel: formatClock(start.hour * 60 + start.minute),
    endLabel: formatClock(end.hour * 60 + end.minute),
    durationLabel: formatDuration((end.epochMilliseconds - start.epochMilliseconds) / 60_000),
  };
}
