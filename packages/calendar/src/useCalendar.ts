/**
 * `useCalendar` — public composable, sole entry point to the
 * `CalendarBuilder`.
 *
 * @example
 * ```ts
 * const { builder, api } = useCalendar<MyEventMeta>();
 *
 * builder
 *   .events(eventsRef)
 *   .timezone('Europe/Vienna')      // C5: display zone
 *   .dstPolicy('reject')             // C4: explicit DST policy
 *   .onEventDrop(({ next, target }) => {
 *     // C3: next.start.timeZoneId / next.end.timeZoneId per-endpoint
 *     // C5: target.displayZone is what the user's eyes saw
 *     // C4: target.disambiguation reports gap/overlap outcome
 *   });
 *
 * watch(api.visibleRange, w => console.log('window changed', w));
 * ```
 *
 * @example
 * ```html
 * <CoarCalendar :builder="builder" />
 * ```
 */

import { CalendarBuilder, type CalendarApi } from './builders/calendar-builder';

export function useCalendar<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
} {
  const builder = CalendarBuilder.create<TMeta>();
  return { builder, api: builder.api };
}
