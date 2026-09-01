/**
 * Time formatting and parsing utilities.
 *
 * Provides locale-aware time formatting with 12h/24h detection,
 * time parsing, and hour/minute manipulation with wrap-around support.
 */
import type { CoarTimePeriod, CoarTimeValue } from './types';

/**
 * Detects whether the given locale uses 12-hour time format.
 * Uses Intl.DateTimeFormat to check for a dayPeriod (AM/PM) indicator.
 *
 * @example
 * coarDetect12HourFormat('en-US') // true
 * coarDetect12HourFormat('de-DE') // false
 */
export function coarDetect12HourFormat(locale: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: 'numeric',
    });
    const parts = formatter.formatToParts(new Date(2024, 0, 1, 14, 30));
    return parts.some((part) => part.type === 'dayPeriod');
  } catch {
    return false;
  }
}

/**
 * Formats a time value as a string.
 *
 * `forMaskedInput` emits the exact canonical text of the Maskito `HH:MM AA`
 * mask: two-digit hour (the mask shreds "8:30 PM" into "83:0" on the first
 * re-mask) and a no-break space before the meridiem (Maskito's own output —
 * a regular space would make every programmatic write differ from the DOM
 * and yank the cursor to the end). 24h output is identical either way.
 *
 * @example
 * coarFormatTime(14, 30, true)         // "14:30"
 * coarFormatTime(14, 30, false)        // "2:30 PM"
 * coarFormatTime(14, 30, false, true)  // "02:30\u00a0PM"
 * coarFormatTime(0, 5, false)          // "12:05 AM"
 */
export function coarFormatTime(
  hours: number,
  minutes: number,
  use24Hour: boolean,
  forMaskedInput = false,
): string {
  const paddedMinutes = String(minutes).padStart(2, '0');

  if (use24Hour) {
    return `${String(hours).padStart(2, '0')}:${paddedMinutes}`;
  }

  const period: CoarTimePeriod = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  if (forMaskedInput) {
    return `${String(displayHours).padStart(2, '0')}:${paddedMinutes}\u00a0${period}`;
  }

  return `${displayHours}:${paddedMinutes} ${period}`;
}

/**
 * Parses a time string into hours and minutes.
 * Supports both 24-hour ("14:30") and 12-hour ("2:30 PM") formats.
 *
 * @returns Parsed time value or null if invalid
 */
export function coarParseTimeInput(text: string): CoarTimeValue | null {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim().toUpperCase();

  // 12-hour format (e.g., "2:30 PM")
  const match12h = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12h) {
    let hours = parseInt(match12h[1], 10);
    const minutes = parseInt(match12h[2], 10);
    const period = match12h[3] as CoarTimePeriod;

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

    hours = period === 'AM' ? (hours === 12 ? 0 : hours) : (hours === 12 ? 12 : hours + 12);
    return { hours, minutes };
  }

  // 24-hour format (e.g., "14:30")
  const match24h = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24h) {
    const hours = parseInt(match24h[1], 10);
    const minutes = parseInt(match24h[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { hours, minutes };
  }

  return null;
}

/**
 * Converts 24-hour hours to 12-hour format with period.
 *
 * @example
 * coarConvertTo12Hour(0)  // { hours: 12, period: 'AM' }
 * coarConvertTo12Hour(14) // { hours: 2, period: 'PM' }
 */
export function coarConvertTo12Hour(hours24: number): { hours: number; period: CoarTimePeriod } {
  const period: CoarTimePeriod = hours24 >= 12 ? 'PM' : 'AM';
  let hours = hours24 % 12;
  if (hours === 0) hours = 12;
  return { hours, period };
}

/**
 * Converts 12-hour format to 24-hour format.
 *
 * @example
 * coarConvertTo24Hour(12, 'AM') // 0
 * coarConvertTo24Hour(2, 'PM')  // 14
 */
export function coarConvertTo24Hour(hours12: number, period: CoarTimePeriod): number {
  if (period === 'AM') return hours12 === 12 ? 0 : hours12;
  return hours12 === 12 ? 12 : hours12 + 12;
}

/**
 * Increments hours with wrap-around (0-23).
 *
 * @example
 * coarIncrementHours(23, 1)  // 0
 * coarIncrementHours(0, -1)  // 23
 */
export function coarIncrementHours(hours: number, delta: number): number {
  const newHours = (hours + delta) % 24;
  return newHours < 0 ? newHours + 24 : newHours;
}

/**
 * Increments minutes with wrap-around and optional hour carry.
 *
 * @example
 * coarIncrementMinutes(55, 5)     // { minutes: 0, hourDelta: 1 }
 * coarIncrementMinutes(0, -5)     // { minutes: 55, hourDelta: -1 }
 * coarIncrementMinutes(30, 15, 15) // { minutes: 45, hourDelta: 0 }
 */
export function coarIncrementMinutes(
  minutes: number,
  delta: number,
  step = 1,
): { minutes: number; hourDelta: number } {
  const actualDelta = delta * step;
  const totalMinutes = minutes + actualDelta;

  let hourDelta = 0;
  let newMinutes = totalMinutes;

  if (totalMinutes >= 60) {
    hourDelta = Math.floor(totalMinutes / 60);
    newMinutes = totalMinutes % 60;
  } else if (totalMinutes < 0) {
    hourDelta = Math.floor(totalMinutes / 60);
    newMinutes = ((totalMinutes % 60) + 60) % 60;
  }

  return { minutes: newMinutes, hourDelta };
}

/** Rounds minutes to the nearest step value. */
export function coarRoundMinutesToStep(minutes: number, step: number): number {
  return Math.round(minutes / step) * step;
}

/** Gets all valid minute values for a given step. */
export function coarGetValidMinutes(step: 1 | 5 | 10 | 15): number[] {
  const values: number[] = [];
  for (let m = 0; m < 60; m += step) {
    values.push(m);
  }
  return values;
}
