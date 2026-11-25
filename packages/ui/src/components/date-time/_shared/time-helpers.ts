/**
 * Time formatting and parsing utilities.
 *
 * Provides locale-aware time formatting with 12h/24h detection,
 * time parsing, and hour/minute manipulation with wrap-around support.
 */
import type { CoarTimePeriod, CoarTimePrecision, CoarTimeValue } from './types';

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
 * coarFormatTime(14, 30, true, false, { seconds: 5, milliseconds: 20 }) // "14:30:05.020"
 */
export function coarFormatTime(
  hours: number,
  minutes: number,
  use24Hour: boolean,
  forMaskedInput = false,
  belowMinute?: { seconds: number; milliseconds?: number },
): string {
  let paddedMinutes = String(minutes).padStart(2, '0');
  if (belowMinute) {
    paddedMinutes += `:${String(belowMinute.seconds).padStart(2, '0')}`;
    if (belowMinute.milliseconds !== undefined) {
      paddedMinutes += `.${String(belowMinute.milliseconds).padStart(3, '0')}`;
    }
  }

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
 * Parses a time string into hours and minutes, with seconds and milliseconds
 * when it has them ("14:30:05", "14:30:05.2" is 200 ms).
 * Supports both 24-hour ("14:30") and 12-hour ("2:30 PM") formats.
 *
 * @returns Parsed time value or null if invalid
 */
export function coarParseTimeInput(text: string): CoarTimeValue | null {
  if (!text || typeof text !== 'string') return null;

  // "14:30", "2:30 PM", "14:30:05", "14:30:05.123", "02:30:05\u00a0PM"
  const match = text
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] === undefined ? undefined : parseInt(match[3], 10);
  const period = match[5] as CoarTimePeriod | undefined;
  if (minutes > 59 || (seconds !== undefined && seconds > 59)) return null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    hours = period === 'AM' ? (hours === 12 ? 0 : hours) : (hours === 12 ? 12 : hours + 12);
  } else if (hours > 23) {
    return null;
  }

  if (seconds === undefined) return { hours, minutes };
  if (match[4] === undefined) return { hours, minutes, seconds };
  return { hours, minutes, seconds, milliseconds: parseInt(match[4].padEnd(3, '0'), 10) };
}

/** The part of a time below the minute that a field of the given precision shows. */
export function coarTimeBelowMinute(
  time: { readonly second: number; readonly millisecond: number },
  precision: CoarTimePrecision,
): { seconds: number; milliseconds?: number } | undefined {
  if (precision === 'minute') return undefined;
  if (precision === 'second') return { seconds: time.second };
  return { seconds: time.second, milliseconds: time.millisecond };
}

/**
 * Whether a time text has exactly the parts a field of the given precision shows:
 * "14:30", "14:30:05" or "14:30:05.123", in 12 hours with AM/PM. Fewer parts are
 * an entry still being typed, more would be cut down.
 */
export function coarTimeTextHasPrecision(text: string, precision: CoarTimePrecision): boolean {
  const time = text.trim().replace(/\s*[AP]M$/i, '');
  const shapes = {
    minute: /^\d{1,2}:\d{2}$/,
    second: /^\d{1,2}:\d{2}:\d{2}$/,
    millisecond: /^\d{1,2}:\d{2}:\d{2}\.\d{3}$/,
  };
  return shapes[precision].test(time);
}

/** Whether a time has more than a field of the given precision can show, such as seconds in a minute field. */
export function coarTimeExceedsPrecision(time: CoarTimeValue, precision: CoarTimePrecision): boolean {
  if (precision === 'millisecond') return false;
  if ((time.milliseconds ?? 0) !== 0) return true;
  return precision === 'minute' && (time.seconds ?? 0) !== 0;
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
