import type { Temporal } from '@js-temporal/polyfill';
import { isAllDayEvent, type CalendarEvent } from './types';

/**
 * Order of the events of one day: all-day first, then by start. Events
 * that start together keep their input order (`Array.prototype.sort` is
 * stable), so an ordering of the host still decides between them.
 */
export function compareEventStart<T extends Record<string, unknown>>(
  a: CalendarEvent<T>,
  b: CalendarEvent<T>,
): number {
  const aAllDay = isAllDayEvent(a);
  const bAllDay = isAllDayEvent(b);
  if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
  if (aAllDay) return 0;
  return (
    (a.start as Temporal.ZonedDateTime).epochMilliseconds -
    (b.start as Temporal.ZonedDateTime).epochMilliseconds
  );
}
