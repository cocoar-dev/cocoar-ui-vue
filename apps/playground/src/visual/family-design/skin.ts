/**
 * Shared by the `family-design-*` stories: how a person becomes the
 * colours of a card. Clock and events: ./calendar-family-data.ts.
 */
import type { CalendarEvent } from '@cocoar/vue-calendar';
import { peopleIds, whoOf } from '../stories/calendar-family-data';

const TONE: Record<string, number> = { lena: 5, jonas: 8, emma: 9, sam: 2 };

export const isEveryone = (event: CalendarEvent) =>
  peopleIds.every((id) => whoOf(event).includes(id));

export function cardStyle(event: CalendarEvent): Record<string, string> {
  const tone = isEveryone(event) ? 7 : (TONE[whoOf(event)[0] ?? ''] ?? 7);
  return { '--family-wash': `var(--t${tone}-wash)`, '--family-stripe': `var(--t${tone}-dot)` };
}

export const personStyle = (id: string | undefined): Record<string, string> => ({
  background: `var(--t${TONE[id ?? ''] ?? 7}-dot)`,
});

export const titleOf = (event: CalendarEvent) => (event.meta as { title: string }).title;

export function clock(event: CalendarEvent): string {
  if (!('timeZoneId' in event.start)) return '';
  const start = event.start.withTimeZone('Europe/Vienna');
  return `${String(start.hour).padStart(2, '0')}:${String(start.minute).padStart(2, '0')}`;
}
