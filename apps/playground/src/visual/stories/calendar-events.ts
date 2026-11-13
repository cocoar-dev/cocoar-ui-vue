/**
 * The fixed events of the calendar stories (`calendar-*.vue`), plain data.
 *
 * The stories run with the clock of their entry in stories.json,
 * `2026-04-15T08:30:00Z`: Wednesday 15 April 2026, 10:30 in Vienna (CEST).
 * Every date below is written out relative to that day, so the pictures do
 * not depend on when they are taken.
 *
 * What the set covers (the things the calendar tokens will touch):
 * - today: Wed Apr 15, with three overlapping meetings and the now-line at 10:30;
 * - all-day bars: DevConf Mon–Wed of today's week, a vacation Fri Apr 17 –
 *   Mon Apr 20 across a week row, Easter Monday Apr 6 as a one-day all-day event;
 * - a timed event spanning days: the offsite Thu Apr 23 15:30 – Sat Apr 25 18:00
 *   (a month bar with the inset at both ends);
 * - "+N": Tue Apr 14 has five timed events (a month cell shows two);
 * - weekends with events, and days of March and May in the month grid;
 * - two events without `meta.color`, drawn in the library's default event
 *   colours: the all-day "Release freeze" Wed–Thu Apr 15–16 and the timed
 *   "Coffee chat" today 08:00, the first event of the day (so a month cell
 *   shows it and does not fold it into "+N").
 */
import { Temporal, type CalendarEvent } from '@cocoar/vue-calendar';

/** The display zone of every calendar story. */
export const displayZone = 'Europe/Vienna';
/** Today, as the fixed clock says. */
export const today = Temporal.PlainDate.from('2026-04-15');
/** The selected day of the month stories. */
export const selectedDay = Temporal.PlainDate.from('2026-04-22');

const day = (iso: string) => Temporal.PlainDate.from(iso);
const at = (iso: string) => Temporal.ZonedDateTime.from(`${iso}[${displayZone}]`);

export const calendarEvents: CalendarEvent[] = [
  // ── All-day ──────────────────────────────────────────────────────────
  {
    id: 'easter-monday',
    start: day('2026-04-06'),
    end: day('2026-04-07'),
    meta: { title: 'Easter Monday', color: '#64748b' },
  },
  {
    id: 'devconf',
    start: day('2026-04-13'),
    end: day('2026-04-16'),
    meta: { title: 'DevConf Vienna', color: '#7c3aed' },
  },
  {
    id: 'vacation',
    start: day('2026-04-17'),
    end: day('2026-04-21'),
    meta: { title: 'Sven on vacation', color: '#0891b2' },
  },
  {
    id: 'labour-day',
    start: day('2026-05-01'),
    end: day('2026-05-02'),
    meta: { title: 'Labour Day', color: '#64748b' },
  },
  {
    id: 'quarter-close',
    start: day('2026-03-31'),
    end: day('2026-04-01'),
    meta: { title: 'Quarter close', color: '#b45309' },
  },

  // No colour: the default event colours.
  {
    id: 'release-freeze',
    start: day('2026-04-15'),
    end: day('2026-04-17'),
    meta: { title: 'Release freeze' },
  },

  // ── A timed event spanning days ───────────────────────────────────────
  {
    id: 'offsite',
    start: at('2026-04-23T15:30:00'),
    end: at('2026-04-25T18:00:00'),
    meta: { title: 'Team offsite', color: '#db2777', location: 'Semmering' },
  },

  // ── Daily standups, Mon–Fri of today's week ───────────────────────────
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: at(`${d}T09:00:00`),
      end: at(`${d}T09:30:00`),
      meta: { title: 'Standup', color: '#10b981' },
    }),
  ),

  // ── Tue Apr 14: five timed events, two fit a month cell (+3) ───────────
  {
    id: 'planning',
    start: at('2026-04-14T10:00:00'),
    end: at('2026-04-14T11:30:00'),
    meta: { title: 'Sprint planning', color: '#2563eb', location: 'Room Danube' },
  },
  {
    id: 'budget',
    start: at('2026-04-14T14:00:00'),
    end: at('2026-04-14T15:00:00'),
    meta: { title: 'Budget review', color: '#ea580c' },
  },
  {
    id: 'interview',
    start: at('2026-04-14T15:30:00'),
    end: at('2026-04-14T16:30:00'),
    meta: { title: 'Interview: frontend', color: '#9333ea' },
  },
  {
    id: 'retro',
    start: at('2026-04-14T17:00:00'),
    end: at('2026-04-14T18:00:00'),
    meta: { title: 'Retrospective', color: '#0d9488' },
  },

  // ── Wed Apr 15 (today): three overlapping meetings ─────────────────────
  // No colour: the default event colours.
  {
    id: 'coffee',
    start: at('2026-04-15T08:00:00'),
    end: at('2026-04-15T08:30:00'),
    meta: { title: 'Coffee chat' },
  },
  {
    id: 'design-review',
    start: at('2026-04-15T11:00:00'),
    end: at('2026-04-15T12:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6', location: 'Studio' },
  },
  {
    id: 'lunch',
    start: at('2026-04-15T12:00:00'),
    end: at('2026-04-15T13:00:00'),
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
  {
    id: 'hiring',
    start: at('2026-04-15T12:15:00'),
    end: at('2026-04-15T13:15:00'),
    meta: { title: 'Hiring sync', color: '#f59e0b' },
  },
  {
    id: 'one-on-one',
    start: at('2026-04-15T15:00:00'),
    end: at('2026-04-15T15:45:00'),
    meta: { title: '1:1 with Bernhard', color: '#3b82f6' },
  },

  // ── The rest of the month ─────────────────────────────────────────────
  {
    id: 'deep-work',
    start: at('2026-04-16T09:30:00'),
    end: at('2026-04-16T13:00:00'),
    meta: { title: 'Deep work: calendar', color: '#1d4ed8' },
  },
  {
    id: 'client-demo',
    start: at('2026-04-17T15:00:00'),
    end: at('2026-04-17T16:30:00'),
    meta: { title: 'Client demo', color: '#dc2626', location: 'Online' },
  },
  {
    id: 'climbing',
    start: at('2026-04-18T10:00:00'),
    end: at('2026-04-18T12:00:00'),
    meta: { title: 'Climbing', color: '#16a34a' },
  },
  {
    id: 'release',
    start: at('2026-04-09T16:00:00'),
    end: at('2026-04-09T17:00:00'),
    meta: { title: 'Release 3.4', color: '#4f46e5' },
  },
  {
    id: 'board',
    start: at('2026-04-22T14:00:00'),
    end: at('2026-04-22T16:00:00'),
    meta: { title: 'Board meeting', color: '#475569' },
  },
  {
    id: 'dentist',
    start: at('2026-04-28T08:00:00'),
    end: at('2026-04-28T09:00:00'),
    meta: { title: 'Dentist', color: '#e11d48' },
  },
];
