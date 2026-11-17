import './compact-fonts';

/**
 * Fixed scene data of the compact calendar stories (`compact-calendar-*.vue`).
 *
 * Adds to `./calendar-events.ts` (read only, not changed) what the compact
 * profile must also show: a point event (no end), assignee avatars with an
 * overflow, a cross-zone and a UTC-anchored ("global") event, background
 * bands of every appearance, a line band and a draft. Dates are relative to
 * the stories' clock, `2026-04-15T08:30:00Z` (Wed 15 Apr 2026, 10:30 Vienna).
 * Event and band colours are consumer data: the profile must render them raw.
 */
import { Temporal, type CalendarBand, type CalendarEvent } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone } from './calendar-events';

const at = (iso: string, zone = displayZone) => Temporal.ZonedDateTime.from(`${iso}[${zone}]`);
const time = (iso: string) => Temporal.PlainTime.from(iso);

const team = [
  { id: 'anna', displayName: 'Anna Berger', color: '#0f766e' },
  { id: 'sven', displayName: 'Sven Ott', color: '#7c3aed' },
  { id: 'lea', displayName: 'Lea Huber' },
  { id: 'max', displayName: 'Max Wolf', color: '#b45309' },
];

export const compactExtraEvents: CalendarEvent[] = [
  // Wed Apr 15: a third all-day lane, so a band capped at two shows "+1".
  {
    id: 'hack-day',
    start: Temporal.PlainDate.from('2026-04-15'),
    end: Temporal.PlainDate.from('2026-04-16'),
    meta: { title: 'Hack day', color: '#ca8a04' },
  },
  // Thu Apr 16: a point event, assignees with "+N", a cross-zone meeting.
  {
    id: 'deploy',
    start: at('2026-04-16T14:00:00'),
    meta: { title: 'Deploy 3.5', color: '#0891b2' },
  },
  {
    id: 'pairing',
    start: at('2026-04-16T15:00:00'),
    end: at('2026-04-16T16:30:00'),
    meta: { title: 'Pairing: compact grid', color: '#4f46e5', location: 'Room Inn', assignees: team },
  },
  {
    id: 'nyc-sync',
    start: at('2026-04-16T11:00:00', 'America/New_York'),
    end: at('2026-04-16T12:00:00', 'America/New_York'),
    meta: { title: 'Sync with New York', color: '#be185d' },
  },
  // Fri Apr 17: an event anchored in UTC ("global").
  {
    id: 'maintenance',
    start: at('2026-04-17T07:00:00', 'UTC'),
    end: at('2026-04-17T08:00:00', 'UTC'),
    meta: { title: 'Global maintenance', color: '#475569' },
  },
];

export const compactEvents: CalendarEvent[] = [...calendarEvents, ...compactExtraEvents];

/** Working-day bands: one per appearance, with and without consumer colour. */
export function compactBands(date: Temporal.PlainDate): CalendarBand[] {
  if (date.dayOfWeek > 5) return [];
  return [
    { kind: 'early', start: time('07:00'), end: time('08:00'), appearance: 'hatch', label: 'Before hours' },
    { kind: 'lunch', start: time('12:00'), end: time('13:00'), label: 'Lunch' },
    {
      kind: 'on-call',
      start: time('17:00'),
      end: time('19:00'),
      appearance: 'outline',
      label: 'On call',
    },
    // A consumer colour: rendered as given.
    { kind: 'focus', start: time('09:30'), end: time('10:00'), color: '#16a34a', label: 'Focus' },
    { kind: 'limit', at: time('18:30'), label: 'max. 10 h' },
  ];
}

/** The draft of the day / rows stories: today 14:00–15:00. */
export const compactDraft = {
  start: at('2026-04-15T14:00:00'),
  end: at('2026-04-15T15:00:00'),
};
