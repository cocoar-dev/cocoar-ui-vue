/**
 * Time-label rule for list-style surfaces (agenda, month list).
 *
 * One place decides what the time column says for an event:
 *
 *   - all-day            → the localised "All day" label
 *   - timed WITH `end`   → "start – end" (both in the display zone)
 *   - timed WITHOUT end  → the start time only (a point event has no
 *                          span to show — matches the time grid's
 *                          point-event rendering)
 *
 * Mirrors `AgendaRenderModel.defaultTimeLabel` in the SwiftUI port:
 * en dash (U+2013) with a space on each side.
 *
 * Deliberately NOT here: formatting itself. The caller passes the
 * `Intl.DateTimeFormat`-backed `formatTime` so the C6 format
 * decisions (locale / timeStyle / hour12) stay with the view.
 */

import type { CalendarEvent } from '../../../core';
import { isAllDayEvent, isTimedEvent } from '../../../core';

export const AGENDA_SPAN_SEPARATOR = ' – ';

export function agendaTimeLabel<TMeta extends Record<string, unknown>>(
  event: CalendarEvent<TMeta>,
  formatTime: (epochMilliseconds: number) => string,
  allDayLabel: string,
): string {
  if (isAllDayEvent(event)) return allDayLabel;
  if (!isTimedEvent(event)) return '';
  const start = formatTime(event.start.epochMilliseconds);
  if (!event.end) return start;
  return `${start}${AGENDA_SPAN_SEPARATOR}${formatTime(event.end.epochMilliseconds)}`;
}
