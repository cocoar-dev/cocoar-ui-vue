/**
 * `formatRangeLabel` — one formatter for the header and `api.rangeLabel`.
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { formatRangeLabel } from '../rangeLabel';
import type { CalendarView, ViewWindow } from '../types';

const cursor = Temporal.PlainDate.from('2026-06-17');
const win = (view: CalendarView, start: string, end: string): ViewWindow => ({
  view,
  start,
  end,
  timezone: 'Europe/Vienna',
});
/** Intl pads the range dash with thin spaces; compare on plain ones. */
const norm = (s: string) => s.replace(/\s/g, ' ');
const label = (view: CalendarView, start: string, end: string, extra = {}) =>
  norm(
    formatRangeLabel({ view, window: win(view, start, end), cursor, locale: 'en-US', ...extra }),
  );

describe('formatRangeLabel', () => {
  it('day: the cursor date in full; a multi-day window as a range', () => {
    expect(label('day', '2026-06-17', '2026-06-18')).toBe('Wednesday, June 17, 2026');
    expect(label('day', '2026-06-17', '2026-06-20')).toBe('Jun 17 – 19, 2026');
    expect(label('dayAgenda', '2026-06-17', '2026-06-18')).toBe('Wednesday, June 17, 2026');
  });

  it('week + work week: the whole week span (the window, not the filtered columns)', () => {
    expect(label('week', '2026-06-15', '2026-06-22')).toBe('Jun 15 – 21, 2026');
    expect(label('workWeek', '2026-06-15', '2026-06-22')).toBe('Jun 15 – 21, 2026');
    // Crossing a month boundary spells both months.
    expect(label('week', '2026-06-29', '2026-07-06')).toBe('Jun 29 – Jul 5, 2026');
  });

  it('month, list, year: cursor-based', () => {
    expect(label('month', '2026-05-25', '2026-07-06')).toBe('June 2026');
    expect(label('monthList', '2026-06-01', '2026-07-01')).toBe('June 2026');
    expect(label('year', '2026-01-01', '2027-01-01')).toBe('2026');
  });

  it('agenda + timeline: the window bounds', () => {
    expect(label('agenda', '2026-06-17', '2026-07-17')).toBe('Jun 17 – Jul 16, 2026');
    expect(label('timeline', '2026-06-17', '2026-06-24')).toBe('Jun 17 – 23, 2026');
  });

  it('honours locale and the C6 dateStyle override', () => {
    expect(
      norm(
        formatRangeLabel({
          view: 'week',
          window: win('week', '2026-06-15', '2026-06-22'),
          cursor,
          locale: 'de-AT',
        }),
      ),
    ).toMatch(/15\.\s?–\s?21\. Juni 2026/);
    // dateStyle replaces the component options wholesale (Intl rule).
    expect(label('day', '2026-06-17', '2026-06-18', { dateStyle: 'short' })).toBe('6/17/26');
  });
});
