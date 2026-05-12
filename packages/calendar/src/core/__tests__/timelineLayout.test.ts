/**
 * `layoutTimeline` — pure layout math for the `'timeline'` view.
 *
 * The layout groups events by recurrence series (or by event.id for
 * standalone events) — each group becomes one row with one or more
 * bars. Tests cover:
 *   - Row shape: id, top, height, isRecurring, bars[].
 *   - Bar geometry: left = (event.start − windowStart) days × ppd.
 *   - Sort order (rows by first bar's left asc, id tie-break;
 *     bars within row by left asc).
 *   - Window clamping + clippedStart / clippedEnd flags.
 *   - All-day vs timed.
 *   - Cross-zone events project into displayZone.
 *   - Single-day events get a positive-width bar.
 *   - Events outside the window are filtered out (whole group too
 *     when none of its bars are in window).
 *   - Recurring series with N occurrences → 1 row with N bars.
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent } from '../types';
import { layoutTimeline, type TimelineLayoutOptions } from '../timelineLayout';

const opts = (
  overrides: Partial<TimelineLayoutOptions> = {},
): TimelineLayoutOptions => ({
  windowStart: Temporal.PlainDate.from('2026-06-01'),
  windowEnd: Temporal.PlainDate.from('2026-07-01'),
  pixelsPerDay: 32,
  rowHeight: 32,
  displayZone: 'Europe/Vienna',
  ...overrides,
});

/** Tag an event with recurrence-series metadata. */
function withSeries<E extends CalendarEvent>(event: E, seriesId: string): E {
  return {
    ...event,
    meta: {
      ...(event.meta as object | undefined),
      __recurrence: { seriesId, recurrenceId: event.start, source: 'rrule' },
    },
  } as E;
}

describe('layoutTimeline — basic shape', () => {
  it('emits one row per standalone event', () => {
    const events: CalendarEvent[] = [
      {
        id: 'b',
        start: Temporal.ZonedDateTime.from(
          '2026-06-15T09:00:00[Europe/Vienna]',
        ),
      },
      {
        id: 'a',
        start: Temporal.ZonedDateTime.from(
          '2026-06-03T09:00:00[Europe/Vienna]',
        ),
      },
    ];
    const layout = layoutTimeline(events, opts());
    expect(layout.rows.length).toBe(2);
    expect(layout.rows.every((r) => r.bars.length === 1)).toBe(true);
    expect(layout.rows.every((r) => !r.isRecurring)).toBe(true);
  });

  it('sorts rows by first bar left asc, id tie-break', () => {
    const events: CalendarEvent[] = [
      {
        id: 'b',
        start: Temporal.ZonedDateTime.from(
          '2026-06-15T09:00:00[Europe/Vienna]',
        ),
      },
      {
        id: 'a',
        start: Temporal.ZonedDateTime.from(
          '2026-06-03T09:00:00[Europe/Vienna]',
        ),
      },
    ];
    const layout = layoutTimeline(events, opts());
    expect(layout.rows.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('id-asc tie-break for equal first-bar left', () => {
    const start = Temporal.ZonedDateTime.from(
      '2026-06-10T09:00:00[Europe/Vienna]',
    );
    const events: CalendarEvent[] = [
      { id: 'beta', start },
      { id: 'alpha', start },
    ];
    const layout = layoutTimeline(events, opts());
    expect(layout.rows.map((r) => r.id)).toEqual(['alpha', 'beta']);
  });

  it('bar left = days × pixelsPerDay', () => {
    const events: CalendarEvent[] = [
      {
        id: 'day-15',
        // June 15 is 14 days after June 1
        start: Temporal.ZonedDateTime.from(
          '2026-06-15T09:00:00[Europe/Vienna]',
        ),
      },
    ];
    const layout = layoutTimeline(events, opts({ pixelsPerDay: 32 }));
    expect(layout.rows[0].bars[0].left).toBe(14 * 32);
  });

  it('row top = row-index × rowHeight', () => {
    const events: CalendarEvent[] = [
      {
        id: 'a',
        start: Temporal.ZonedDateTime.from(
          '2026-06-01T09:00:00[Europe/Vienna]',
        ),
      },
      {
        id: 'b',
        start: Temporal.ZonedDateTime.from(
          '2026-06-02T09:00:00[Europe/Vienna]',
        ),
      },
    ];
    const layout = layoutTimeline(events, opts({ rowHeight: 40 }));
    expect(layout.rows[0].top).toBe(0);
    expect(layout.rows[1].top).toBe(40);
  });

  it('totalWidth = (windowEnd − windowStart) days × pixelsPerDay', () => {
    const layout = layoutTimeline([], opts({ pixelsPerDay: 32 }));
    // June has 30 days.
    expect(layout.totalWidth).toBe(30 * 32);
  });

  it('totalHeight = rows.length × rowHeight', () => {
    const events: CalendarEvent[] = [
      {
        id: 'a',
        start: Temporal.ZonedDateTime.from(
          '2026-06-05T09:00:00[Europe/Vienna]',
        ),
      },
      {
        id: 'b',
        start: Temporal.ZonedDateTime.from(
          '2026-06-10T09:00:00[Europe/Vienna]',
        ),
      },
      {
        id: 'c',
        start: Temporal.ZonedDateTime.from(
          '2026-06-20T09:00:00[Europe/Vienna]',
        ),
      },
    ];
    const layout = layoutTimeline(events, opts({ rowHeight: 32 }));
    expect(layout.totalHeight).toBe(3 * 32);
  });
});

describe('layoutTimeline — recurrence grouping', () => {
  it('collapses multiple occurrences of one series into a single row', () => {
    // Five weekly Standup occurrences in June.
    const events: CalendarEvent[] = [
      'standup__2026-06-01',
      'standup__2026-06-08',
      'standup__2026-06-15',
      'standup__2026-06-22',
      'standup__2026-06-29',
    ].map((id, i) =>
      withSeries(
        {
          id,
          start: Temporal.ZonedDateTime.from(
            `2026-06-${String(1 + i * 7).padStart(2, '0')}T09:00:00[Europe/Vienna]`,
          ),
        },
        'standup',
      ),
    );
    const layout = layoutTimeline(events, opts());
    expect(layout.rows.length).toBe(1);
    expect(layout.rows[0].id).toBe('standup');
    expect(layout.rows[0].isRecurring).toBe(true);
    expect(layout.rows[0].bars.length).toBe(5);
  });

  it('bars within a recurring row are sorted by left asc', () => {
    // Pass occurrences out of date order — bars should come back sorted.
    const events: CalendarEvent[] = [
      withSeries(
        {
          id: 'standup__2026-06-15',
          start: Temporal.ZonedDateTime.from(
            '2026-06-15T09:00:00[Europe/Vienna]',
          ),
        },
        'standup',
      ),
      withSeries(
        {
          id: 'standup__2026-06-01',
          start: Temporal.ZonedDateTime.from(
            '2026-06-01T09:00:00[Europe/Vienna]',
          ),
        },
        'standup',
      ),
      withSeries(
        {
          id: 'standup__2026-06-08',
          start: Temporal.ZonedDateTime.from(
            '2026-06-08T09:00:00[Europe/Vienna]',
          ),
        },
        'standup',
      ),
    ];
    const layout = layoutTimeline(events, opts());
    expect(layout.rows[0].bars.map((b) => b.left)).toEqual([
      0,
      7 * 32,
      14 * 32,
    ]);
  });

  it('mixed: 1 recurring series + 1 standalone → 2 rows', () => {
    const events: CalendarEvent[] = [
      withSeries(
        {
          id: 'standup__2026-06-08',
          start: Temporal.ZonedDateTime.from(
            '2026-06-08T09:00:00[Europe/Vienna]',
          ),
        },
        'standup',
      ),
      withSeries(
        {
          id: 'standup__2026-06-15',
          start: Temporal.ZonedDateTime.from(
            '2026-06-15T09:00:00[Europe/Vienna]',
          ),
        },
        'standup',
      ),
      {
        id: 'one-off',
        start: Temporal.ZonedDateTime.from(
          '2026-06-10T14:00:00[Europe/Vienna]',
        ),
      },
    ];
    const layout = layoutTimeline(events, opts());
    expect(layout.rows.length).toBe(2);
    // Row order: standup's first bar (June 8) < one-off (June 10),
    // so standup row comes first.
    expect(layout.rows.map((r) => r.id)).toEqual(['standup', 'one-off']);
    expect(layout.rows[0].isRecurring).toBe(true);
    expect(layout.rows[1].isRecurring).toBe(false);
    expect(layout.rows[0].bars.length).toBe(2);
    expect(layout.rows[1].bars.length).toBe(1);
  });

  it('two separate series → two separate rows', () => {
    const events: CalendarEvent[] = [
      withSeries(
        {
          id: 'standup__2026-06-01',
          start: Temporal.ZonedDateTime.from(
            '2026-06-01T09:00:00[Europe/Vienna]',
          ),
        },
        'standup',
      ),
      withSeries(
        {
          id: 'sprint-review__2026-06-05',
          start: Temporal.ZonedDateTime.from(
            '2026-06-05T15:00:00[Europe/Vienna]',
          ),
        },
        'sprint-review',
      ),
    ];
    const layout = layoutTimeline(events, opts());
    expect(layout.rows.length).toBe(2);
    expect(layout.rows.map((r) => r.id).sort()).toEqual([
      'sprint-review',
      'standup',
    ]);
  });

  it('rows are sorted by first bar in each row', () => {
    const events: CalendarEvent[] = [
      // sprint-review's first occurrence: June 5
      withSeries(
        {
          id: 'sprint-review__2026-06-05',
          start: Temporal.ZonedDateTime.from(
            '2026-06-05T15:00:00[Europe/Vienna]',
          ),
        },
        'sprint-review',
      ),
      withSeries(
        {
          id: 'sprint-review__2026-06-19',
          start: Temporal.ZonedDateTime.from(
            '2026-06-19T15:00:00[Europe/Vienna]',
          ),
        },
        'sprint-review',
      ),
      // standup's first occurrence: June 1 — should sort BEFORE sprint-review
      withSeries(
        {
          id: 'standup__2026-06-01',
          start: Temporal.ZonedDateTime.from(
            '2026-06-01T09:00:00[Europe/Vienna]',
          ),
        },
        'standup',
      ),
    ];
    const layout = layoutTimeline(events, opts());
    expect(layout.rows.map((r) => r.id)).toEqual(['standup', 'sprint-review']);
  });

  it('series with zero in-window bars is filtered out entirely', () => {
    const events: CalendarEvent[] = [
      withSeries(
        {
          id: 'past__2026-05-01',
          start: Temporal.ZonedDateTime.from(
            '2026-05-01T09:00:00[Europe/Vienna]',
          ),
        },
        'past',
      ),
    ];
    const layout = layoutTimeline(events, opts());
    expect(layout.rows.length).toBe(0);
  });
});

describe('layoutTimeline — all-day events', () => {
  it('a single-day all-day event gets a positive-width bar', () => {
    const events: CalendarEvent[] = [
      {
        id: 'holiday',
        start: Temporal.PlainDate.from('2026-06-15'),
      },
    ];
    const layout = layoutTimeline(events, opts({ pixelsPerDay: 32 }));
    expect(layout.rows[0].bars[0].width).toBe(32);
  });

  it('a multi-day all-day event spans (end − start) days', () => {
    const events: CalendarEvent[] = [
      {
        id: 'vacation',
        start: Temporal.PlainDate.from('2026-06-10'),
        end: Temporal.PlainDate.from('2026-06-15'),
      },
    ];
    const layout = layoutTimeline(events, opts({ pixelsPerDay: 32 }));
    // 5-day span (10/11/12/13/14, exclusive of 15)
    expect(layout.rows[0].bars[0].width).toBe(5 * 32);
  });
});

describe('layoutTimeline — timed events', () => {
  it('a single-day timed event (09:00–09:30) spans one day', () => {
    const events: CalendarEvent[] = [
      {
        id: 'standup',
        start: Temporal.ZonedDateTime.from(
          '2026-06-15T09:00:00[Europe/Vienna]',
        ),
        end: Temporal.ZonedDateTime.from(
          '2026-06-15T09:30:00[Europe/Vienna]',
        ),
      },
    ];
    const layout = layoutTimeline(events, opts({ pixelsPerDay: 32 }));
    expect(layout.rows[0].bars[0].width).toBe(32);
  });

  it('a timed event without explicit end defaults to start + 30min (still single-day)', () => {
    const events: CalendarEvent[] = [
      {
        id: 'no-end',
        start: Temporal.ZonedDateTime.from(
          '2026-06-15T09:00:00[Europe/Vienna]',
        ),
      },
    ];
    const layout = layoutTimeline(events, opts({ pixelsPerDay: 32 }));
    expect(layout.rows[0].bars[0].width).toBe(32);
  });
});

describe('layoutTimeline — window clamping', () => {
  it('event starting before window: clippedStart=true, left=0', () => {
    const events: CalendarEvent[] = [
      {
        id: 'ongoing',
        start: Temporal.PlainDate.from('2026-05-25'),
        end: Temporal.PlainDate.from('2026-06-05'),
      },
    ];
    const layout = layoutTimeline(events, opts());
    const bar = layout.rows[0].bars[0];
    expect(bar.clippedStart).toBe(true);
    expect(bar.left).toBe(0);
    // Visible portion is 4 days (June 1–4, exclusive of 5)
    expect(bar.width).toBe(4 * 32);
  });

  it('event ending after window: clippedEnd=true', () => {
    const events: CalendarEvent[] = [
      {
        id: 'long-running',
        start: Temporal.PlainDate.from('2026-06-25'),
        end: Temporal.PlainDate.from('2026-07-10'),
      },
    ];
    const layout = layoutTimeline(events, opts());
    const bar = layout.rows[0].bars[0];
    expect(bar.clippedEnd).toBe(true);
    // Visible portion: June 25 → July 1 = 6 days
    expect(bar.width).toBe(6 * 32);
  });

  it('filters out events entirely before the window', () => {
    const events: CalendarEvent[] = [
      {
        id: 'past',
        start: Temporal.PlainDate.from('2026-05-01'),
        end: Temporal.PlainDate.from('2026-05-10'),
      },
    ];
    const layout = layoutTimeline(events, opts());
    expect(layout.rows.length).toBe(0);
  });

  it('filters out events entirely after the window', () => {
    const events: CalendarEvent[] = [
      {
        id: 'future',
        start: Temporal.PlainDate.from('2026-08-01'),
      },
    ];
    const layout = layoutTimeline(events, opts());
    expect(layout.rows.length).toBe(0);
  });
});

describe('layoutTimeline — cross-zone events', () => {
  it('projects timed events into the display zone for date computation', () => {
    // 01:00 Tokyo on June 15 = 18:00 Vienna on June 14.
    const events: CalendarEvent[] = [
      {
        id: 'cross-zone',
        start: Temporal.ZonedDateTime.from('2026-06-15T01:00:00[Asia/Tokyo]'),
        end: Temporal.ZonedDateTime.from('2026-06-15T02:00:00[Asia/Tokyo]'),
      },
    ];
    const layout = layoutTimeline(events, opts({ displayZone: 'Europe/Vienna' }));
    // In Vienna the event is on June 14, which is 13 days after June 1.
    expect(layout.rows[0].bars[0].left).toBe(13 * 32);
  });
});
