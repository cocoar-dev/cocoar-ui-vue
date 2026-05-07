/**
 * `getEventZoneHints` — pin the C3 / C5 surface logic that drives the
 * default decoration layer (globe icon for UTC, cross-zone tag for
 * source-zone ≠ display-zone).
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent } from '../core';
import { getEventZoneHints } from './event-zone-hints';

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const pd = (iso: string) => Temporal.PlainDate.from(iso);

describe('getEventZoneHints', () => {
  it('returns no hints for an all-day event', () => {
    const e: CalendarEvent = { id: 'a', start: pd('2026-06-15') };
    expect(getEventZoneHints(e, 'Europe/Vienna')).toEqual({
      isUtcAnchored: false,
      sourceZone: null,
    });
  });

  it('returns no hints when source zone equals display zone', () => {
    const e: CalendarEvent = { id: 'a', start: zdt('2026-06-15T10:00:00', 'Europe/Vienna') };
    expect(getEventZoneHints(e, 'Europe/Vienna')).toEqual({
      isUtcAnchored: false,
      sourceZone: null,
    });
  });

  it('flags UTC-anchored events even when display is the same zone', () => {
    const e: CalendarEvent = { id: 'a', start: zdt('2026-06-15T10:00:00', 'UTC') };
    expect(getEventZoneHints(e, 'UTC')).toEqual({
      isUtcAnchored: true,
      sourceZone: null,
    });
  });

  it('flags UTC-anchored events when display is a different zone', () => {
    // Article 5 — UTC-anchored events get the "global" hint regardless
    // of what the user's display zone happens to be.
    const e: CalendarEvent = { id: 'a', start: zdt('2026-06-15T10:00:00', 'UTC') };
    expect(getEventZoneHints(e, 'America/New_York')).toEqual({
      isUtcAnchored: true,
      sourceZone: null,
    });
  });

  it('surfaces the source zone when it differs from the display zone (and is not UTC)', () => {
    // Article 3 — render in display zone but don't hide the source.
    const e: CalendarEvent = { id: 'a', start: zdt('2026-06-15T10:00:00', 'Asia/Tokyo') };
    expect(getEventZoneHints(e, 'Europe/Vienna')).toEqual({
      isUtcAnchored: false,
      sourceZone: 'Asia/Tokyo',
    });
  });

  it('returns no hints when displayZone is undefined (cannot decide cross-zone)', () => {
    const e: CalendarEvent = { id: 'a', start: zdt('2026-06-15T10:00:00', 'Asia/Tokyo') };
    expect(getEventZoneHints(e, undefined)).toEqual({
      isUtcAnchored: false,
      sourceZone: null,
    });
  });

  it('still flags UTC even when displayZone is undefined', () => {
    // The "global event" semantic doesn't depend on knowing the display
    // zone — UTC is intrinsically the "same instant worldwide" anchor.
    const e: CalendarEvent = { id: 'a', start: zdt('2026-06-15T10:00:00', 'UTC') };
    expect(getEventZoneHints(e, undefined)).toEqual({
      isUtcAnchored: true,
      sourceZone: null,
    });
  });
});
