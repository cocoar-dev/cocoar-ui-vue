/**
 * Cross-zone, multi-locale, and mixed-shape tests for
 * `@cocoar/vue-calendar`. Pins down behaviour for events whose source
 * zone differs from the display zone, events that span across day
 * boundaries in the display zone, and locale-specific layout
 * concerns (RTL-friendly, weekday-order).
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { EventIndex } from '../../eventIndex';
import { layoutDayEvents } from '../../timeGridLayout';
import { layoutMonthGrid } from '../../monthGridLayout';
import { buildAgendaItems } from '../../agendaLayout';
import {
  detectFirstDayOfWeekFromLocale,
  detectHour12FromLocale,
  monthGridDates,
  startOfWeek,
  type DayOfWeek,
} from '../../temporal';
import {
  applyMoveToEvent,
  type CalendarDropTarget,
} from '../../dnd/move-math';
import type { CalendarEvent } from '../../types';
import { pd, zdt } from '../../../__test-utils__/event-fixtures';

const target = (
  date: string,
  minutes: number | null,
  displayZone: string,
): CalendarDropTarget => ({ date, minutes, displayZone, valid: true });

// ─── Cross-zone bucketing in the EventIndex ──────────────────────────

describe('Cross-zone bucketing — EventIndex', () => {
  it('Tokyo event 09:00 on Jun 15 buckets in Vienna on Jun 15', () => {
    const idx = new EventIndex({ timezone: 'Europe/Vienna' });
    idx.insert({ id: 't', start: zdt('2026-06-15T09:00:00', 'Asia/Tokyo') });
    // 09:00 Tokyo = 02:00 Vienna (summer UTC+2) — same day.
    expect(idx.byDay('2026-06-15').map((e) => e.id)).toEqual(['t']);
  });

  it('Tokyo event 03:00 on Jun 15 buckets in LA on Jun 14', () => {
    const idx = new EventIndex({ timezone: 'America/Los_Angeles' });
    idx.insert({ id: 't', start: zdt('2026-06-15T03:00:00', 'Asia/Tokyo') });
    // 03:00 Tokyo on 06-15 = 11:00 LA on 06-14 (PDT UTC-7).
    expect(idx.byDay('2026-06-14').map((e) => e.id)).toEqual(['t']);
    expect(idx.byDay('2026-06-15').length).toBe(0);
  });

  it('mixed-zone event start=Tokyo end=Vienna spans both days in Vienna', () => {
    const idx = new EventIndex({ timezone: 'Europe/Vienna' });
    idx.insert({
      id: 'flight',
      start: zdt('2026-06-15T22:00:00', 'Asia/Tokyo'), // 15:00 UTC
      end: zdt('2026-06-16T06:00:00', 'Europe/Vienna'), // 04:00 UTC
    });
    // 15:00 UTC on Jun 15 == 17:00 Vienna on Jun 15.
    // 04:00 UTC on Jun 16 == 06:00 Vienna on Jun 16.
    // → spans Jun 15 + Jun 16 in Vienna.
    expect(idx.byDay('2026-06-15').length).toBe(1);
    expect(idx.byDay('2026-06-16').length).toBe(1);
  });

  it('mixed-zone event start=LA end=Vienna spans across the date line', () => {
    const idx = new EventIndex({ timezone: 'Europe/Vienna' });
    idx.insert({
      id: 'flight',
      start: zdt('2026-06-15T10:00:00', 'America/Los_Angeles'), // 17:00 UTC = 19:00 Vienna
      end: zdt('2026-06-16T08:00:00', 'Europe/Vienna'), // 06:00 UTC
    });
    expect(idx.byDay('2026-06-15').length).toBe(1);
    expect(idx.byDay('2026-06-16').length).toBe(1);
  });

  it('all-day xmas appears on Dec 25 in EVERY zone (zone-less)', () => {
    const ev: CalendarEvent = { id: 'xmas', start: pd('2026-12-25') };
    for (const tz of [
      'UTC',
      'Europe/Vienna',
      'Asia/Tokyo',
      'America/Los_Angeles',
      'Pacific/Honolulu',
      'Pacific/Kiritimati',
    ]) {
      const idx = new EventIndex({ timezone: tz });
      idx.insert(ev);
      expect(idx.byDay('2026-12-25').map((e) => e.id)).toEqual(['xmas']);
    }
  });
});

// ─── Cross-zone DnD: source zone preserved ──────────────────────────

describe('Cross-zone DnD — source zone preservation', () => {
  it('Tokyo source, Vienna display, drop on 14:00 Vienna → Tokyo zone kept', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-06-15T17:00:00', 'Asia/Tokyo'), // 10:00 Vienna
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-06-15', 14 * 60, 'Europe/Vienna'),
      'timed',
    );
    const start = next.start as Temporal.ZonedDateTime;
    expect(start.timeZoneId).toBe('Asia/Tokyo');
    expect(start.withTimeZone('Europe/Vienna').hour).toBe(14);
    // Tokyo wall-clock: 14:00 Vienna == 21:00 Tokyo (summer JST = UTC+9, CEST = UTC+2)
    expect(start.hour).toBe(21);
  });

  it('LA source, Tokyo display, drop on 09:00 Tokyo → LA zone kept', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-06-14T17:00:00', 'America/Los_Angeles'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-06-15', 9 * 60, 'Asia/Tokyo'),
      'timed',
    );
    const start = next.start as Temporal.ZonedDateTime;
    expect(start.timeZoneId).toBe('America/Los_Angeles');
    expect(start.withTimeZone('Asia/Tokyo').hour).toBe(9);
  });

  it('cross-zone end is preserved after a move (each endpoint keeps its zone)', () => {
    // Article-4 spirit: each endpoint is the human's intent in its own
    // zone. A Tokyo→Vienna flight dragged to a new slot must keep the
    // Vienna arrival as Vienna, not silently re-write to Tokyo.
    const ev: CalendarEvent = {
      id: 'flight',
      start: zdt('2026-06-15T18:00:00', 'Asia/Tokyo'),
      end: zdt('2026-06-15T22:00:00', 'Europe/Vienna'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-06-16', 12 * 60, 'Europe/Vienna'),
      'timed',
    );
    const start = next.start as Temporal.ZonedDateTime;
    const end = next.end as Temporal.ZonedDateTime;
    expect(start.timeZoneId).toBe('Asia/Tokyo');
    expect(end.timeZoneId).toBe('Europe/Vienna');
    // Duration preserved exactly (article 4: derive math from intent).
    const oldDurMs =
      ev.end.epochMilliseconds - ev.start.epochMilliseconds;
    const newDurMs = end.epochMilliseconds - start.epochMilliseconds;
    expect(newDurMs).toBe(oldDurMs);
  });

  it('cross-zone end is preserved after a resize-end (Vienna stays Vienna)', () => {
    const ev: CalendarEvent = {
      id: 'flight',
      start: zdt('2026-06-15T18:00:00', 'Asia/Tokyo'),
      end: zdt('2026-06-15T22:00:00', 'Europe/Vienna'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-06-16', 6 * 60, 'Europe/Vienna'),
      'timed-resize-end',
    );
    const start = next.start as Temporal.ZonedDateTime;
    const end = next.end as Temporal.ZonedDateTime;
    expect(start.timeZoneId).toBe('Asia/Tokyo');
    expect(end.timeZoneId).toBe('Europe/Vienna');
    expect(end.withTimeZone('Europe/Vienna').hour).toBe(6);
  });

  it('cross-zone start is preserved after a resize-start (Tokyo stays Tokyo)', () => {
    const ev: CalendarEvent = {
      id: 'flight',
      start: zdt('2026-06-15T18:00:00', 'Asia/Tokyo'),
      end: zdt('2026-06-15T22:00:00', 'Europe/Vienna'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-06-15', 12 * 60, 'Europe/Vienna'),
      'timed-resize-start',
    );
    const start = next.start as Temporal.ZonedDateTime;
    const end = next.end as Temporal.ZonedDateTime;
    expect(start.timeZoneId).toBe('Asia/Tokyo');
    expect(end.timeZoneId).toBe('Europe/Vienna');
  });
});

// ─── Locale-specific behaviour ──────────────────────────────────────

describe('Locale — first day of week + hour12 detection', () => {
  it('en-US starts week on Sunday (0)', () => {
    expect(detectFirstDayOfWeekFromLocale('en-US')).toBe(0);
  });

  it('de-AT starts week on Monday (1)', () => {
    expect(detectFirstDayOfWeekFromLocale('de-AT')).toBe(1);
  });

  it('ar-SA returns a deterministic DayOfWeek (CLDR data may vary)', () => {
    // Intl.Locale.weekInfo is Stage 3 — different runtimes ship
    // different CLDR snapshots. Saudi Arabia historically used
    // Saturday-first (6); newer CLDR ships Sunday (0) for ar-SA.
    // We assert determinism + range, not the specific value (which
    // is a runtime CLDR concern, not a library concern).
    const result = detectFirstDayOfWeekFromLocale('ar-SA');
    expect([0, 1, 6]).toContain(result);
  });

  it('en-US uses 12-hour clock', () => {
    expect(detectHour12FromLocale('en-US')).toBe(true);
  });

  it('de-DE uses 24-hour clock', () => {
    expect(detectHour12FromLocale('de-DE')).toBe(false);
  });

  it('ja-JP uses 24-hour clock by default', () => {
    expect(detectHour12FromLocale('ja-JP')).toBe(false);
  });
});

describe('Locale — weekday order in monthGridDates', () => {
  it('en-US (firstDayOfWeek=0) places Sunday in column 0', () => {
    const ym = Temporal.PlainYearMonth.from('2026-04');
    const dates = monthGridDates(ym, 0);
    expect(dates[0].dayOfWeek).toBe(7); // Temporal: 7 = Sunday
  });

  it('de-AT (firstDayOfWeek=1) places Monday in column 0', () => {
    const ym = Temporal.PlainYearMonth.from('2026-04');
    const dates = monthGridDates(ym, 1);
    expect(dates[0].dayOfWeek).toBe(1); // Temporal: 1 = Monday
  });

  it('Saturday-first month grid places Saturday in column 0', () => {
    const ym = Temporal.PlainYearMonth.from('2026-04');
    const dates = monthGridDates(ym, 6);
    expect(dates[0].dayOfWeek).toBe(6); // Temporal: 6 = Saturday
  });

  it('startOfWeek with Saturday-first lands on Saturday', () => {
    const wed = Temporal.PlainDate.from('2026-04-15'); // Wednesday
    const sat = startOfWeek(wed, 6 as DayOfWeek);
    expect(sat.toString()).toBe('2026-04-11'); // Saturday before Wed Apr 15
  });
});

// ─── Display-zone switch in time grid layout ─────────────────────────

describe('Display-zone switch — time grid layout', () => {
  it('Vienna meeting shifts column when display flips Vienna → Tokyo', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-06-15T10:00:00', 'Europe/Vienna'),
      end: zdt('2026-06-15T11:00:00', 'Europe/Vienna'),
    };
    const day = Temporal.PlainDate.from('2026-06-15');

    const inVienna = layoutDayEvents([ev], {
      day,
      timeRange: [0, 24],
      timezone: 'Europe/Vienna',
    });
    expect(inVienna[0].startMinutes).toBe(10 * 60);

    const inTokyo = layoutDayEvents([ev], {
      day,
      timeRange: [0, 24],
      timezone: 'Asia/Tokyo',
    });
    // 10:00 Vienna == 17:00 Tokyo.
    expect(inTokyo[0].startMinutes).toBe(17 * 60);
  });
});

// ─── Mixed all-day + timed events on the same day ────────────────────

describe('Mixed all-day + timed in agenda', () => {
  it('all-day events sort before timed events within a day', () => {
    const events: CalendarEvent[] = [
      {
        id: 'meet',
        start: zdt('2026-06-15T10:00:00', 'Europe/Vienna'),
        end: zdt('2026-06-15T11:00:00', 'Europe/Vienna'),
      },
      { id: 'holiday', start: pd('2026-06-15') },
    ];
    const items = buildAgendaItems(events, {
      rangeStart: '2026-06-15',
      rangeEnd: '2026-06-16',
      timezone: 'Europe/Vienna',
    });
    const eventItems = items.filter((i) => i.kind === 'event');
    expect(eventItems[0].event.id).toBe('holiday');
    expect(eventItems[1].event.id).toBe('meet');
  });
});

// ─── Mixed-zone + all-day in month grid ──────────────────────────────

describe('Month grid — multi-zone single-day events render once each', () => {
  it('three events in three zones on same calendar day in display zone', () => {
    const events: CalendarEvent[] = [
      {
        id: 'tok',
        start: zdt('2026-06-15T17:00:00', 'Asia/Tokyo'), // 10:00 Vienna
        end: zdt('2026-06-15T18:00:00', 'Asia/Tokyo'),
      },
      {
        id: 'la',
        start: zdt('2026-06-15T01:00:00', 'America/Los_Angeles'), // 10:00 Vienna
        end: zdt('2026-06-15T02:00:00', 'America/Los_Angeles'),
      },
      {
        id: 'vie',
        start: zdt('2026-06-15T10:00:00', 'Europe/Vienna'),
        end: zdt('2026-06-15T11:00:00', 'Europe/Vienna'),
      },
    ];
    const ym = Temporal.PlainYearMonth.from('2026-06');
    const grid = monthGridDates(ym, 1); // Monday-first
    const layout = layoutMonthGrid(events, {
      gridDates: grid,
      timezone: 'Europe/Vienna',
    });
    // All three should be pills on the same Vienna day cell.
    let pillsOnDay = 0;
    for (const row of layout.weekRows) {
      const cell = row.cellPills.get('2026-06-15');
      if (cell) pillsOnDay = cell.length;
    }
    expect(pillsOnDay).toBe(3);
  });
});
