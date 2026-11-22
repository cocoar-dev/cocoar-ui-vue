/**
 * One day with a time-grid column per resource.
 *
 * A shared event becomes one block across neighbouring columns as long
 * as it is alone in each of them. Where it overlaps something in one of
 * them it falls apart into a piece per column, so nothing is covered.
 * Columns that are not neighbours always get separate blocks of the
 * same event.
 */

import { dayBoundsOf, dayOrdinal } from './monthGridLayout';
import { layoutOverlappingIntervals } from './overlapLayout';
import type { Temporal } from './temporal';
import { layoutDayEvents, type AllDayBar, type PositionedEvent } from './timeGridLayout';
import { isAllDayEvent, type CalendarEvent } from './types';

export interface CalendarResource {
  id: string;
  label?: string;
  color?: string;
}

/** Column of the events that belong to no listed resource. */
export const UNASSIGNED_RESOURCE = '__unassigned';

export interface ResourceBlock<TMeta extends Record<string, unknown> = Record<string, unknown>>
  extends PositionedEvent<TMeta> {
  /** First and last column, inclusive. */
  startCol: number;
  endCol: number;
  /** Stable per block; an event can have several. */
  key: string;
}

export interface ResourceAllDayBlock<TMeta extends Record<string, unknown> = Record<string, unknown>>
  extends AllDayBar<TMeta> {
  key: string;
}

export interface ResourceDayLayout<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  /** Resource ids per column; `UNASSIGNED_RESOURCE` when such events exist. */
  columns: string[];
  blocks: ResourceBlock<TMeta>[];
  allDay: ResourceAllDayBlock<TMeta>[];
  allDayLaneCount: number;
}

export interface ResourceDayOptions<TMeta extends Record<string, unknown>> {
  day: Temporal.PlainDate;
  resources: ReadonlyArray<string>;
  resourcesOf: (event: CalendarEvent<TMeta>) => ReadonlyArray<string>;
  /** `[startHour, endHour]` of the grid. */
  timeRange: readonly [number, number];
  /** Display zone. */
  timezone: string;
}

/** Runs of neighbouring columns in a sorted list. */
function neighbourRuns(columns: number[]): number[][] {
  const runs: number[][] = [];
  for (const col of columns) {
    const run = runs[runs.length - 1];
    if (run && run[run.length - 1] === col - 1) run.push(col);
    else runs.push([col]);
  }
  return runs;
}

/** Lay out one day across resource columns. Pure. */
export function layoutResourceDay<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  events: ReadonlyArray<CalendarEvent<TMeta>>,
  options: ResourceDayOptions<TMeta>,
): ResourceDayLayout<TMeta> {
  const { day, resources, resourcesOf, timeRange, timezone } = options;
  const ordinal = dayOrdinal(day);
  const onDay = events.filter((event) => {
    const bounds = dayBoundsOf(event as CalendarEvent, timezone);
    return bounds.firstOrd <= ordinal && bounds.lastOrd >= ordinal;
  });
  const known = new Map(resources.map((id, col) => [id, col]));
  const columnsOf = (event: CalendarEvent<TMeta>) =>
    [...new Set(resourcesOf(event).flatMap((id) => known.get(id) ?? []))].sort((a, b) => a - b);

  const hasUnassigned = onDay.some((event) => columnsOf(event).length === 0);
  const columns = hasUnassigned ? [...resources, UNASSIGNED_RESOURCE] : [...resources];
  const placed = (event: CalendarEvent<TMeta>) => {
    const cols = columnsOf(event);
    return cols.length > 0 ? cols : [columns.length - 1];
  };

  // ─── Timed ─────────────────────────────────────────────────────────
  const timed = onDay.filter((event) => !isAllDayEvent(event));
  const perColumn = columns.map((_, col) =>
    layoutDayEvents(
      timed.filter((event) => placed(event).includes(col)),
      { day, timeRange, timezone },
    ),
  );
  const isAlone = (col: number, item: PositionedEvent<TMeta>) =>
    !perColumn[col].some(
      (other) =>
        other.event.id !== item.event.id &&
        other.startMinutes < item.endMinutes &&
        other.endMinutes > item.startMinutes,
    );

  const blocks: ResourceBlock<TMeta>[] = [];
  for (const event of timed) {
    for (const run of neighbourRuns(placed(event))) {
      const items = run.map((col) => perColumn[col].find((p) => p.event.id === event.id));
      const first = items[0];
      if (!first) continue; // outside the visible hours
      if (run.every((col, i) => items[i] && isAlone(col, items[i]!))) {
        blocks.push({
          ...first,
          lane: 0,
          laneCount: 1,
          startCol: run[0],
          endCol: run[run.length - 1],
          key: `${event.id}#${run[0]}`,
        });
        continue;
      }
      run.forEach((col, i) => {
        const item = items[i];
        if (item) blocks.push({ ...item, startCol: col, endCol: col, key: `${event.id}#${col}` });
      });
    }
  }

  // ─── All-day ───────────────────────────────────────────────────────
  const spans = onDay
    .filter((event) => isAllDayEvent(event))
    .flatMap((event) =>
      neighbourRuns(placed(event)).map((run) => ({
        event,
        startCol: run[0],
        endCol: run[run.length - 1],
        key: `${event.id}#${run[0]}`,
      })),
    );
  const lanes = layoutOverlappingIntervals(
    spans.map((span) => ({ id: span.key, start: span.startCol, end: span.endCol })),
  );
  const laneByKey = new Map(lanes.bars.map((bar) => [bar.id, bar.lane]));
  const allDay = spans.map((span) => {
    const bounds = dayBoundsOf(span.event as CalendarEvent, timezone);
    return {
      ...span,
      lane: laneByKey.get(span.key) ?? 0,
      laneCount: lanes.laneCount,
      clippedStart: bounds.firstOrd < ordinal,
      clippedEnd: bounds.lastOrd > ordinal,
    };
  });

  return { columns, blocks, allDay, allDayLaneCount: lanes.laneCount };
}
