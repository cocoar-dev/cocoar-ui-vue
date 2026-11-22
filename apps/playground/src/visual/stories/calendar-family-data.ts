/**
 * The fixed week of the family calendar stories (`calendar-board-*`,
 * `calendar-resource-day`, `calendar-year-wall`, `calendar-paged-month`),
 * plain data. Their clock is `2026-11-19T13:12:00Z`: Thursday 19 November
 * 2026, 14:12 in Vienna.
 *
 * What the set covers: a shared event in neighbouring columns (`Parents
 * evening`), one in columns that are not neighbours (`Hike`), an overlap
 * in one column that breaks a shared block (`Lunch` with `Call`), an
 * event without a person, all-day and multi-day bars, and a band across a
 * month end for the wall planner.
 */
import { Temporal, type CalendarEvent, type CalendarPeriod } from '@cocoar/vue-calendar';

export const familyZone = 'Europe/Vienna';
export const familyToday = Temporal.PlainDate.from('2026-11-19');

export type FamilyMeta = { title: string; color?: string; who: string[] };

export const people = [
  { id: 'jonas', label: 'Jonas', color: '#2563eb' },
  { id: 'lena', label: 'Lena', color: '#2f855a' },
  { id: 'sam', label: 'Sam', color: '#c05621' },
  { id: 'emma', label: 'Emma', color: '#7c3aed' },
];
export const peopleIds = people.map((p) => p.id);

export const dayParts: CalendarPeriod[] = [
  { key: 'morning', startMinutes: 0, endMinutes: 12 * 60, dropMinutes: 8 * 60 },
  { key: 'afternoon', startMinutes: 12 * 60, endMinutes: 18 * 60 },
  { key: 'evening', startMinutes: 18 * 60, endMinutes: 24 * 60 },
];

const at = (iso: string) => Temporal.ZonedDateTime.from(`${iso}[${familyZone}]`);
const day = (iso: string) => Temporal.PlainDate.from(iso);
const timed = (
  id: string,
  start: string,
  end: string,
  who: string[],
  color?: string,
): CalendarEvent<FamilyMeta> => ({
  id,
  start: at(start),
  end: at(end),
  meta: { title: id, who, ...(color ? { color } : {}) },
});

export const familyEvents: CalendarEvent<FamilyMeta>[] = [
  { id: 'Project week', start: day('2026-11-16'), end: day('2026-11-21'), meta: { title: 'Project week', color: '#c05621', who: ['sam'] } },
  { id: 'Grandma visits', start: day('2026-11-19'), end: day('2026-11-20'), meta: { title: 'Grandma visits', color: '#64748b', who: ['lena', 'sam'] } },
  { id: 'Summer holidays', start: day('2026-07-04'), end: day('2026-09-07'), meta: { title: 'Summer holidays', color: '#0891b2', who: peopleIds } },
  { id: 'Birthday', start: day('2026-03-12'), end: day('2026-03-13'), meta: { title: 'Birthday', color: '#7c3aed', who: ['emma'] } },
  timed('Dentist', '2026-11-16T09:00', '2026-11-16T10:00', ['jonas'], '#2563eb'),
  timed('Swimming', '2026-11-17T16:00', '2026-11-17T17:00', ['emma'], '#7c3aed'),
  timed('Lunch', '2026-11-19T12:00', '2026-11-19T13:30', ['lena', 'sam'], '#2f855a'),
  timed('Call', '2026-11-19T12:30', '2026-11-19T13:00', ['sam'], '#c05621'),
  timed('Training', '2026-11-19T15:30', '2026-11-19T17:00', ['emma'], '#7c3aed'),
  timed('Parents evening', '2026-11-19T19:00', '2026-11-19T20:30', ['lena', 'sam'], '#2f855a'),
  timed('Delivery', '2026-11-19T10:00', '2026-11-19T10:30', []),
  timed('Hike', '2026-11-22T10:00', '2026-11-22T15:00', ['jonas', 'sam'], '#2563eb'),
  timed('Car service', '2026-11-27T08:00', '2026-11-27T09:00', ['jonas'], '#2563eb'),
  timed('Market', '2026-12-05T14:00', '2026-12-05T18:00', peopleIds, '#2f855a'),
];

export const whoOf = (event: CalendarEvent) => (event.meta as FamilyMeta | undefined)?.who ?? [];
