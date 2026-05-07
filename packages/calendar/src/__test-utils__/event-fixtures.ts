/**
 * Internal test-only helpers for constructing `Temporal.ZonedDateTime`
 * / `Temporal.PlainDate` event fixtures cheaply. Not exported from the
 * package — fixtures are a test concern, not a public API.
 *
 *   zdt('2026-04-13T09:00')                  // → ZDT in UTC
 *   zdt('2026-04-13T09:00', 'Europe/Vienna') // → ZDT in Vienna
 *   pd('2026-04-13')                         // → PlainDate
 */

import { Temporal } from '@js-temporal/polyfill';

export const zdt = (iso: string, zone = 'UTC'): Temporal.ZonedDateTime => {
  // Strip a trailing Z if present — caller's intent is the wall-time,
  // and `[Zone]` annotation defines the zone authoritatively.
  const stripped = iso.endsWith('Z') ? iso.slice(0, -1) : iso;
  return Temporal.ZonedDateTime.from(`${stripped}[${zone}]`);
};

export const pd = (iso: string): Temporal.PlainDate =>
  Temporal.PlainDate.from(iso);
