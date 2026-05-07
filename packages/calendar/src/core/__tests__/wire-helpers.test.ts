/**
 * D3 — Public wire-format helpers (Article 8 contract).
 *
 * These tests pin three contracts:
 *
 *   1. **Round-trip property** — `formatScheduledTime(parseScheduledTime(w))`
 *      equals `w` for any non-DST-edge input. The library never silently
 *      drops information across the wire boundary.
 *
 *   2. **DST policy is honored** — gaps and overlaps resolve per the
 *      passed `dstPolicy`; `'reject'` throws with a recognisable message.
 *
 *   3. **Errors are specific** — bogus IANA zones / malformed local
 *      strings produce helpful messages that name the offending value
 *      (so dev-time debugging doesn't require `console.log` inserts).
 *
 * Article basis: Article 4 (store intent, derive math), Article 5
 * (DST policy MUST be explicit), Article 8 (structured wire shape).
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import {
  parseScheduledTime,
  parsePlainDate,
  formatScheduledTime,
  type ScheduledTimeWire,
} from '../temporal';

describe('parseScheduledTime', () => {
  it('parses a clean wire value into a ZonedDateTime', () => {
    const zdt = parseScheduledTime({
      local: '2026-06-05T10:00:00',
      timeZoneId: 'Europe/Vienna',
    });
    expect(zdt).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(zdt.timeZoneId).toBe('Europe/Vienna');
    expect(zdt.year).toBe(2026);
    expect(zdt.month).toBe(6);
    expect(zdt.day).toBe(5);
    expect(zdt.hour).toBe(10);
    expect(zdt.minute).toBe(0);
  });

  it('preserves intent across timezones (Article 4 — same local, different zones = different instants)', () => {
    const inVienna = parseScheduledTime({
      local: '2026-06-05T10:00:00',
      timeZoneId: 'Europe/Vienna',
    });
    const inTokyo = parseScheduledTime({
      local: '2026-06-05T10:00:00',
      timeZoneId: 'Asia/Tokyo',
    });
    // Same local wall-time, different zones → different instants
    expect(
      Temporal.Instant.compare(inVienna.toInstant(), inTokyo.toInstant()),
    ).not.toBe(0);
    // Both keep their source zone
    expect(inVienna.timeZoneId).toBe('Europe/Vienna');
    expect(inTokyo.timeZoneId).toBe('Asia/Tokyo');
  });

  it("defaults dstPolicy to 'compatible' (Temporal default)", () => {
    // 2026-03-29 02:30 Vienna doesn't exist — clocks jump 02:00 → 03:00.
    // Default 'compatible' shifts forward.
    const zdt = parseScheduledTime({
      local: '2026-03-29T02:30:00',
      timeZoneId: 'Europe/Vienna',
    });
    expect(zdt.hour).toBe(3); // shifted forward
  });

  it("dstPolicy='reject' throws with a specific message on a DST gap", () => {
    expect(() =>
      parseScheduledTime({
        local: '2026-03-29T02:30:00',
        timeZoneId: 'Europe/Vienna',
        dstPolicy: 'reject',
      }),
    ).toThrow(/DST gap|reject/);
  });

  it("dstPolicy='earlier' picks the first occurrence in a DST overlap", () => {
    // 2026-10-25 02:30 Vienna exists twice (clocks fall back 03:00 → 02:00).
    const zdt = parseScheduledTime({
      local: '2026-10-25T02:30:00',
      timeZoneId: 'Europe/Vienna',
      dstPolicy: 'earlier',
    });
    // The earlier occurrence is in CEST (UTC+2 → 00:30 UTC).
    expect(zdt.toInstant().toString()).toBe('2026-10-25T00:30:00Z');
  });

  it("dstPolicy='later' picks the second occurrence in a DST overlap", () => {
    const zdt = parseScheduledTime({
      local: '2026-10-25T02:30:00',
      timeZoneId: 'Europe/Vienna',
      dstPolicy: 'later',
    });
    // The later occurrence is in CET (UTC+1 → 01:30 UTC).
    expect(zdt.toInstant().toString()).toBe('2026-10-25T01:30:00Z');
  });

  it('rejects bogus IANA zone names with a message naming the offender', () => {
    expect(() =>
      parseScheduledTime({
        local: '2026-06-05T10:00:00',
        timeZoneId: 'Europe/Wien', // typo for Europe/Vienna
      }),
    ).toThrow(/Europe\/Wien/);
  });

  it('accepts what Temporal accepts — abbreviations like "CET" pass through (polyfill alias to fixed-offset zones)', () => {
    // Article 2 recommends consumers use full IANA names like
    // 'Europe/Vienna' and avoid abbreviations like 'CET' / 'EST'.
    // BUT this is a consumer best-practice, not a library invariant —
    // Temporal's own validation accepts 'CET' (as a fixed-offset
    // alias), so v2's `parseScheduledTime` does too. Documented;
    // tested so we notice if Temporal's behaviour changes upstream.
    const zdt = parseScheduledTime({
      local: '2026-06-05T10:00:00',
      timeZoneId: 'CET',
    });
    expect(zdt).toBeInstanceOf(Temporal.ZonedDateTime);
    // The accepted zoneId stays whatever Temporal canonicalised it to;
    // we don't assert a specific value because the polyfill version
    // may rewrite it.
    expect(typeof zdt.timeZoneId).toBe('string');
  });

  it('rejects malformed local strings with a message naming the offender', () => {
    expect(() =>
      parseScheduledTime({
        local: 'not-a-date',
        timeZoneId: 'Europe/Vienna',
      }),
    ).toThrow(/not-a-date|ISO/);
  });
});

describe('parsePlainDate', () => {
  it('parses a clean ISO date', () => {
    const pd = parsePlainDate('2026-06-05');
    expect(pd).toBeInstanceOf(Temporal.PlainDate);
    expect(pd.year).toBe(2026);
    expect(pd.month).toBe(6);
    expect(pd.day).toBe(5);
  });

  it('rejects malformed dates with a specific message', () => {
    expect(() => parsePlainDate('2026-13-50')).toThrow();
    expect(() => parsePlainDate('not-a-date')).toThrow(/not-a-date|ISO/);
  });
});

describe('formatScheduledTime', () => {
  it('produces the wire shape Article 8 expects', () => {
    const zdt = Temporal.ZonedDateTime.from(
      '2026-06-05T10:00:00[Europe/Vienna]',
    );
    const wire = formatScheduledTime(zdt);
    expect(wire).toEqual({
      local: '2026-06-05T10:00:00',
      timeZoneId: 'Europe/Vienna',
    });
  });

  it('preserves source zone for cross-zone events (C3)', () => {
    // A flight Tokyo → Vienna: end is in Vienna source zone, even
    // if the calendar renders in another display zone.
    const tokyo = Temporal.ZonedDateTime.from(
      '2026-06-05T22:00:00[Asia/Tokyo]',
    );
    const vienna = Temporal.ZonedDateTime.from(
      '2026-06-06T06:00:00[Europe/Vienna]',
    );
    expect(formatScheduledTime(tokyo).timeZoneId).toBe('Asia/Tokyo');
    expect(formatScheduledTime(vienna).timeZoneId).toBe('Europe/Vienna');
  });
});

describe('round-trip property (parse → format → parse)', () => {
  const cases: ScheduledTimeWire[] = [
    { local: '2026-06-05T10:00:00', timeZoneId: 'Europe/Vienna' },
    { local: '2026-01-15T14:30:00', timeZoneId: 'America/Los_Angeles' },
    { local: '2026-07-04T09:00:00', timeZoneId: 'Asia/Tokyo' },
    { local: '2026-12-31T23:59:00', timeZoneId: 'Australia/Sydney' },
    { local: '2026-06-15T12:00:00', timeZoneId: 'Australia/Lord_Howe' }, // 30-min DST shift
    { local: '1990-03-15T00:00:00', timeZoneId: 'UTC' },
  ];
  it.each(cases)('round-trips %j', (wire) => {
    const zdt = parseScheduledTime(wire);
    const back = formatScheduledTime(zdt);
    expect(back).toEqual(wire);
  });

  it('resolves a DST gap input to its policy-determined value (no information loss after first parse)', () => {
    // First parse with 'compatible' shifts the gap forward;
    // formatting + re-parsing must give the same ZDT, not throw.
    const wire: ScheduledTimeWire = {
      local: '2026-03-29T02:30:00',
      timeZoneId: 'Europe/Vienna',
    };
    const first = parseScheduledTime(wire);
    const wireAfter = formatScheduledTime(first);
    expect(wireAfter.local).toBe('2026-03-29T03:30:00'); // shifted
    expect(wireAfter.timeZoneId).toBe('Europe/Vienna');
    const second = parseScheduledTime(wireAfter);
    // Second parse is on a clean wall-time; round-trip is now stable.
    expect(formatScheduledTime(second)).toEqual(wireAfter);
  });
});
