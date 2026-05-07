/**
 * Phase 0 Spike B — RRULE corpus for the engine bake-off.
 *
 * Composition:
 *   - simple weekly / monthly / yearly patterns (the 80% case)
 *   - BYSETPOS variants (last weekday of month, second-to-last)
 *   - BYDAY × BYWEEKNO combinations (CalendarSpec stress)
 *   - daily with COUNT and daily with UNTIL (bounded variants)
 *   - pathological multi-list combos that historically expose
 *     `rrule.js` performance cliffs
 *   - the full RFC 5545 §3.8.5.3 example set (the spec's own torture
 *     test for any compliant engine)
 *
 * Each fixture carries:
 *   - `id`           short stable identifier for diff-friendly
 *                    benchmark tables
 *   - `description`  human-readable summary
 *   - `rrule`        the RRULE: line content (without the `RRULE:` prefix)
 *   - `dtstart`      ISO-8601 string (always UTC unless `tzid` is set)
 *   - `tzid`         optional IANA timezone (RFC 5545 timezone-aware
 *                    semantics — historically the slowest path in
 *                    `rrule.js`)
 *   - `category`     used to group bench results
 *
 * Bench scenarios in the harness (`recurrence-bakeoff.bench.ts`) consume
 * subsets of this corpus — e.g. S1 picks 1 entry × 10-year window, S2
 * picks 1.000 randomly-rotated entries × 1-week window.
 */

export type FixtureCategory =
  | 'simple'
  | 'monthly-bysetpos'
  | 'yearly'
  | 'bounded-count'
  | 'bounded-until'
  | 'pathological'
  | 'rfc-5545';

export interface RuleFixture {
  id: string;
  description: string;
  rrule: string;
  /** ISO-8601 datetime, e.g. '20240101T090000Z' or '20240101T090000'. */
  dtstart: string;
  /** Optional IANA timezone for timezone-aware fixtures. */
  tzid?: string;
  category: FixtureCategory;
}

export const corpus: readonly RuleFixture[] = [
  // ── Simple ─────────────────────────────────────────────────────────
  {
    id: 'simple-weekdays',
    description: 'Every weekday',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    dtstart: '20240101T090000Z',
    category: 'simple',
  },
  {
    id: 'simple-weekly-mwf',
    description: 'Every Monday, Wednesday, Friday',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    dtstart: '20240101T090000Z',
    category: 'simple',
  },
  {
    id: 'simple-biweekly',
    description: 'Every other week on Monday',
    rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO',
    dtstart: '20240101T090000Z',
    category: 'simple',
  },
  {
    id: 'simple-daily',
    description: 'Daily',
    rrule: 'FREQ=DAILY',
    dtstart: '20240101T090000Z',
    category: 'simple',
  },
  {
    id: 'simple-monthly-1st',
    description: 'First of every month',
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
    dtstart: '20240101T090000Z',
    category: 'simple',
  },
  {
    id: 'simple-monthly-15th',
    description: 'Fifteenth of every month',
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=15',
    dtstart: '20240115T090000Z',
    category: 'simple',
  },

  // ── Monthly with BYSETPOS ──────────────────────────────────────────
  {
    id: 'bysetpos-last-friday',
    description: 'Last Friday of every month',
    rrule: 'FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1',
    dtstart: '20240126T090000Z',
    category: 'monthly-bysetpos',
  },
  {
    id: 'bysetpos-second-last-weekday',
    description: 'Second-to-last weekday of every month',
    rrule: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-2',
    dtstart: '20240130T090000Z',
    category: 'monthly-bysetpos',
  },
  {
    id: 'bysetpos-first-monday',
    description: 'First Monday of every month',
    rrule: 'FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1',
    dtstart: '20240101T090000Z',
    category: 'monthly-bysetpos',
  },
  {
    id: 'bysetpos-third-thursday',
    description: 'Third Thursday of every month',
    rrule: 'FREQ=MONTHLY;BYDAY=TH;BYSETPOS=3',
    dtstart: '20240118T090000Z',
    category: 'monthly-bysetpos',
  },

  // ── Yearly with BYMONTH + BYDAY ───────────────────────────────────
  {
    id: 'yearly-thanksgiving',
    description: 'Thanksgiving — 4th Thursday of November',
    rrule: 'FREQ=YEARLY;BYMONTH=11;BYDAY=4TH',
    dtstart: '20241128T090000Z',
    category: 'yearly',
  },
  {
    id: 'yearly-mothers-day',
    description: "Mother's Day — 2nd Sunday of May",
    rrule: 'FREQ=YEARLY;BYMONTH=5;BYDAY=2SU',
    dtstart: '20240512T090000Z',
    category: 'yearly',
  },
  {
    id: 'yearly-quarter-fridays',
    description: 'Last Friday of every quarter',
    rrule: 'FREQ=YEARLY;BYMONTH=3,6,9,12;BYDAY=FR;BYSETPOS=-1',
    dtstart: '20240329T090000Z',
    category: 'yearly',
  },
  {
    id: 'yearly-jan-feb-1st',
    description: '1st of January and February each year',
    rrule: 'FREQ=YEARLY;BYMONTH=1,2;BYMONTHDAY=1',
    dtstart: '20240101T090000Z',
    category: 'yearly',
  },

  // ── Bounded by COUNT ──────────────────────────────────────────────
  {
    id: 'count-30-daily',
    description: 'Daily, exactly 30 occurrences',
    rrule: 'FREQ=DAILY;COUNT=30',
    dtstart: '20240101T090000Z',
    category: 'bounded-count',
  },
  {
    id: 'count-365-daily',
    description: 'Daily, exactly 365 occurrences (one year of dailies)',
    rrule: 'FREQ=DAILY;COUNT=365',
    dtstart: '20240101T090000Z',
    category: 'bounded-count',
  },
  {
    id: 'count-100-weekly',
    description: 'Weekly, 100 occurrences',
    rrule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=100',
    dtstart: '20240101T090000Z',
    category: 'bounded-count',
  },

  // ── Bounded by UNTIL ─────────────────────────────────────────────
  {
    id: 'until-2030-weekdays',
    description: 'Every weekday until 2030',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20300101T000000Z',
    dtstart: '20240101T090000Z',
    category: 'bounded-until',
  },
  {
    id: 'until-2035-monthly',
    description: 'Monthly until 2035',
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=1;UNTIL=20350101T000000Z',
    dtstart: '20240101T090000Z',
    category: 'bounded-until',
  },

  // ── Pathological ──────────────────────────────────────────────────
  {
    id: 'patho-byday-byweekno',
    description: 'BYDAY × BYWEEKNO list (CalendarSpec stress)',
    rrule: 'FREQ=YEARLY;BYWEEKNO=1,13,26,40;BYDAY=MO,TH',
    dtstart: '20240101T090000Z',
    category: 'pathological',
  },
  {
    id: 'patho-bysetpos-list',
    description: 'BYSETPOS list — 1st and last weekday of every month',
    rrule: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=1,-1',
    dtstart: '20240101T090000Z',
    category: 'pathological',
  },
  {
    id: 'patho-yearly-bymonth-bymonthday-list',
    description: 'BYMONTH × BYMONTHDAY list — quarterly heavy',
    rrule: 'FREQ=YEARLY;BYMONTH=3,6,9,12;BYMONTHDAY=1,15',
    dtstart: '20240301T090000Z',
    category: 'pathological',
  },
  {
    id: 'patho-byyearday-list',
    description: 'BYYEARDAY list — 12 days a year',
    rrule: 'FREQ=YEARLY;BYYEARDAY=1,32,60,91,121,152,182,213,244,274,305,335',
    dtstart: '20240101T090000Z',
    category: 'pathological',
  },
  {
    id: 'patho-tz-pacific',
    description: 'Daily in Pacific/Kiritimati (UTC+14, edge timezone)',
    rrule: 'FREQ=DAILY;COUNT=365',
    dtstart: '20240101T090000',
    tzid: 'Pacific/Kiritimati',
    category: 'pathological',
  },
  {
    id: 'patho-tz-dst',
    description: 'Daily across DST transitions in America/Chicago',
    rrule: 'FREQ=DAILY;COUNT=365',
    dtstart: '20240101T090000',
    tzid: 'America/Chicago',
    category: 'pathological',
  },

  // ── RFC 5545 §3.8.5.3 examples ────────────────────────────────────
  // The spec's own examples — every compliant engine should handle
  // these correctly and reasonably fast. Discrepancies between
  // engines on these fixtures are red flags.
  {
    id: 'rfc-daily-10',
    description: 'RFC: Daily for 10 occurrences',
    rrule: 'FREQ=DAILY;COUNT=10',
    dtstart: '19970902T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-daily-until-dec1997',
    description: 'RFC: Daily until December 24, 1997',
    rrule: 'FREQ=DAILY;UNTIL=19971224T000000Z',
    dtstart: '19970902T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-every-other-day',
    description: 'RFC: Every other day, forever',
    rrule: 'FREQ=DAILY;INTERVAL=2',
    dtstart: '19970902T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-every-10-days-5-times',
    description: 'RFC: Every 10 days, 5 occurrences',
    rrule: 'FREQ=DAILY;INTERVAL=10;COUNT=5',
    dtstart: '19970902T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-yearly-jan-everyday',
    description: 'RFC: Every day in January, for 3 years',
    rrule: 'FREQ=YEARLY;UNTIL=20000131T140000Z;BYMONTH=1;BYDAY=SU,MO,TU,WE,TH,FR,SA',
    dtstart: '19980101T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-weekly-10',
    description: 'RFC: Weekly for 10 occurrences',
    rrule: 'FREQ=WEEKLY;COUNT=10',
    dtstart: '19970902T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-weekly-until-dec1997',
    description: 'RFC: Weekly until December 24, 1997',
    rrule: 'FREQ=WEEKLY;UNTIL=19971224T000000Z',
    dtstart: '19970902T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-every-other-week-tu-th',
    description: 'RFC: Every other week on Tuesday and Thursday, for 8 occurrences',
    rrule: 'FREQ=WEEKLY;INTERVAL=2;COUNT=8;WKST=SU;BYDAY=TU,TH',
    dtstart: '19970902T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-monthly-1st-friday-10',
    description: 'RFC: Monthly on the first Friday for 10 occurrences',
    rrule: 'FREQ=MONTHLY;COUNT=10;BYDAY=1FR',
    dtstart: '19970905T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-monthly-1st-last-2y',
    description: 'RFC: Every other month on 1st and last Sunday, 10 occurrences',
    rrule: 'FREQ=MONTHLY;INTERVAL=2;COUNT=10;BYDAY=1SU,-1SU',
    dtstart: '19970907T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-monthly-second-to-last-mon',
    description: 'RFC: Monthly on the second-to-last Monday of the month for 6 months',
    rrule: 'FREQ=MONTHLY;COUNT=6;BYDAY=-2MO',
    dtstart: '19970922T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-monthly-last-day',
    description: 'RFC: Monthly on the last day of the month, for 7 months',
    rrule: 'FREQ=MONTHLY;COUNT=7;BYMONTHDAY=-1',
    dtstart: '19970928T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-yearly-june-july-10',
    description: 'RFC: Yearly in June and July for 10 occurrences',
    rrule: 'FREQ=YEARLY;COUNT=10;BYMONTH=6,7',
    dtstart: '19970610T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-yearly-jan-feb-mar-3y',
    description: 'RFC: Every other year on Jan, Feb, Mar — 10 occurrences',
    rrule: 'FREQ=YEARLY;INTERVAL=2;COUNT=10;BYMONTH=1,2,3',
    dtstart: '19970310T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-yearly-by-dayofyear',
    description: 'RFC: Every 3rd year on the 1st, 100th, and 200th day, 10 occurrences',
    rrule: 'FREQ=YEARLY;INTERVAL=3;COUNT=10;BYYEARDAY=1,100,200',
    dtstart: '19970101T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-yearly-monday-week-20',
    description: 'RFC: Every 20th Monday of the year, forever',
    rrule: 'FREQ=YEARLY;BYDAY=20MO',
    dtstart: '19970519T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-monthly-byweekno',
    description: 'RFC: Monday of week number 20 (where the default WKST=MO), forever',
    rrule: 'FREQ=YEARLY;BYWEEKNO=20;BYDAY=MO',
    dtstart: '19970512T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-thursday-march',
    description: 'RFC: Every Thursday in March, forever',
    rrule: 'FREQ=YEARLY;BYMONTH=3;BYDAY=TH',
    dtstart: '19970313T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-thursday-june-july-aug',
    description: 'RFC: Every Thursday, but only during June, July, and August',
    rrule: 'FREQ=YEARLY;BYDAY=TH;BYMONTH=6,7,8',
    dtstart: '19970605T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-friday-13',
    description: 'RFC: Every Friday the 13th, forever',
    rrule: 'FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13',
    dtstart: '19980213T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-first-saturday-following-1st-sunday',
    description: 'RFC: First Saturday that follows the first Sunday of the month',
    rrule: 'FREQ=MONTHLY;BYDAY=SA;BYMONTHDAY=7,8,9,10,11,12,13',
    dtstart: '19970913T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-3rd-instance',
    description: 'RFC: Third instance into the month of one of Tu/We/Th, for 3 months',
    rrule: 'FREQ=MONTHLY;COUNT=3;BYDAY=TU,WE,TH;BYSETPOS=3',
    dtstart: '19970904T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-second-to-last-weekday',
    description: 'RFC: Second-to-last weekday of the month',
    rrule: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-2',
    dtstart: '19970929T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-every-3-hours-9-5',
    description: 'RFC: Every 3 hours from 9 to 17 on a specific day',
    rrule: 'FREQ=HOURLY;INTERVAL=3;UNTIL=19970902T170000Z',
    dtstart: '19970902T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
  {
    id: 'rfc-every-15-min-6-times',
    description: 'RFC: Every 15 minutes for 6 occurrences',
    rrule: 'FREQ=MINUTELY;INTERVAL=15;COUNT=6',
    dtstart: '19970902T090000',
    tzid: 'America/New_York',
    category: 'rfc-5545',
  },
];

/** Group by category. */
export function byCategory(c: FixtureCategory): readonly RuleFixture[] {
  return corpus.filter((f) => f.category === c);
}

/** Compose `DTSTART:.../RRULE:...` per RFC 5545. */
export function toIcalString(f: RuleFixture): string {
  const dtPrefix = f.tzid ? `DTSTART;TZID=${f.tzid}:${f.dtstart}` : `DTSTART:${f.dtstart}`;
  return `${dtPrefix}\nRRULE:${f.rrule}`;
}
