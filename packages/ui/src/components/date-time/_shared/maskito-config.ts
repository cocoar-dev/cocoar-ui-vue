/**
 * Maskito date/datetime mask configuration generators.
 *
 * Maps our DateFormatConfig patterns to Maskito's date mask options, and keeps
 * the mask from changing what was entered: the pickers parse the text and
 * refuse what is not a value, so the mask must hand them the text as written.
 */
import type { MaskitoOptions, MaskitoPostprocessor, MaskitoPreprocessor } from '@maskito/core';
import { maskitoDateOptionsGenerator, maskitoDateTimeOptionsGenerator } from '@maskito/kit';

import type { CoarTimePrecision, DateFormatConfig } from './types';
import { COAR_DATE_FORMAT_TO_MASKITO_MODE } from './types';
import { coarFormatPlainDate, coarGetDateSeparatorForPattern, coarParsePlainDateFromInput } from './date-helpers';
import { coarFormatTime, coarParseTimeInput, coarTimeExceedsPrecision } from './time-helpers';

type Pattern = DateFormatConfig['pattern'];

/** What `normalize` answers for text the field cannot take without changing it. */
const REFUSE = Symbol('refuse');

/**
 * Whether inserted text can be part of an entry of the field: only the characters
 * of its notation, and no more digits than it holds. Anything else, such as an
 * ISO timestamp or seven fractional digits, would reach Maskito, which keeps only
 * the digits it has room for and can make another date of them (#115).
 */
function fitsField(data: string, pattern: Pattern, extra: string, digits: number): boolean {
  const separator = coarGetDateSeparatorForPattern(pattern).replace(/[-/\\.]/g, '\\$&');
  const allowed = new RegExp(`^[\\d${separator}\\s${extra}]*$`, 'i');
  return allowed.test(data) && data.replace(/\D/g, '').length <= digits;
}

/** A complete date part (all digits typed) that is no calendar day, such as 30.02. */
function isImpossibleDay(value: string, pattern: Pattern): boolean {
  const datePart = value.slice(0, pattern.length);
  if (datePart.length !== pattern.length || !/^\d+$/.test(datePart.split(coarGetDateSeparatorForPattern(pattern)).join(''))) {
    return false;
  }
  return coarParsePlainDateFromInput(datePart, pattern) === null;
}

/**
 * Maskito's last postprocessor applies min/max: it turns every complete date into
 * a JS `Date` and writes it back, so 30.02.2026 became 02.03.2026 before the
 * picker could refuse it (#109). It still runs for every other value, where it
 * raises incomplete segments to their minimum while typing.
 */
function withoutRollover(postprocessors: readonly MaskitoPostprocessor[], pattern: Pattern): MaskitoPostprocessor[] {
  const minMax = postprocessors[postprocessors.length - 1];
  const guarded: MaskitoPostprocessor = (state, initial) =>
    isImpossibleDay(state.value, pattern) ? state : minMax(state, initial);
  return [...postprocessors.slice(0, -1), guarded];
}

/**
 * A value inserted at once (paste, drop, `fill`, a replacement) that, with the rest
 * of the field, is a complete value replaces the field in the picker's own
 * notation. Maskito's own preprocessors read only its digits and lost an AM/PM
 * (#110), so the first of the pair notes the value and the last inserts it into
 * the emptied field, after Maskito's. Keystrokes and anything that is not a value
 * go through the mask as before.
 *
 * Text the field cannot take without changing it is not cut down (#111, #115):
 * a value with more precision than the field shows, or text that is no part of
 * an entry (`fits` is false). The insertion is cancelled and `onRefuse` gets the
 * text, for the picker to show it as refused.
 */
function wholeValuePreprocessors(
  normalize: (text: string) => string | typeof REFUSE | null,
  fits: (data: string) => boolean,
  onRefuse?: (text: string) => void,
): [first: MaskitoPreprocessor, last: MaskitoPreprocessor] {
  let whole: string | typeof REFUSE | null = null;
  let text = '';
  const first: MaskitoPreprocessor = ({ elementState, data }, actionType) => {
    whole = null;
    if (actionType === 'insert' && data.length > 1) {
      const [from, to] = elementState.selection;
      text = (elementState.value.slice(0, from) + data + elementState.value.slice(to)).trim();
      whole = normalize(text) ?? (fits(data) ? null : REFUSE);
    }
    return { elementState, data };
  };
  const last: MaskitoPreprocessor = ({ elementState, data }) => {
    if (whole === null) return { elementState, data };
    const value = whole;
    whole = null;
    if (value === REFUSE) {
      // Maskito cancels an insertion that adds nothing to the field.
      onRefuse?.(text);
      return { elementState, data: '' };
    }
    return { elementState: { value: '', selection: [0, 0] }, data: value };
  };
  return [first, last];
}

function normalizeDate(text: string, pattern: Pattern): string | null {
  const date = coarParsePlainDateFromInput(text, pattern);
  return date ? coarFormatPlainDate(date, pattern) : null;
}

/** "<date> <time>", also with a comma or several spaces between them, the time in 12 or 24 hours. */
function normalizeDateTime(
  text: string,
  pattern: Pattern,
  use12Hour: boolean,
  precision: CoarTimePrecision,
): string | typeof REFUSE | null {
  const match = text.match(/^(\S+?),?\s+(.+)$/);
  if (!match) return null;
  const date = normalizeDate(match[1], pattern);
  const time = coarParseTimeInput(match[2]);
  if (!date || !time) return null;
  if (coarTimeExceedsPrecision(time, precision)) return REFUSE;
  const seconds = time.seconds ?? 0;
  const belowMinute = precision === 'minute' ? undefined
    : precision === 'second' ? { seconds } : { seconds, milliseconds: time.milliseconds ?? 0 };
  return `${date} ${coarFormatTime(time.hours, time.minutes, !use12Hour, true, belowMinute)}`;
}

const TIME_MODES = {
  minute: ['HH:MM', 'HH:MM AA'],
  second: ['HH:MM:SS', 'HH:MM:SS AA'],
  millisecond: ['HH:MM:SS.MSS', 'HH:MM:SS.MSS AA'],
} as const;

/**
 * Creates a Maskito date mask for a given date format pattern.
 *
 * @example
 * const mask = coarCreateDateMask('dd.mm.yyyy') // masks "01.06.2026"
 * const mask = coarCreateDateMask('mm/dd/yyyy') // masks "06/01/2026"
 */
export function coarCreateDateMask(pattern: Pattern, onRefuse?: (text: string) => void): MaskitoOptions {
  const options = maskitoDateOptionsGenerator({
    mode: COAR_DATE_FORMAT_TO_MASKITO_MODE[pattern],
    separator: coarGetDateSeparatorForPattern(pattern),
  });
  const [first, last] = wholeValuePreprocessors(
    (text) => normalizeDate(text, pattern),
    (data) => fitsField(data, pattern, '', 8),
    onRefuse,
  );
  return {
    ...options,
    preprocessors: [first, ...options.preprocessors, last],
    postprocessors: withoutRollover(options.postprocessors, pattern),
  };
}

/**
 * Creates a Maskito datetime mask for a given date format pattern and time options.
 *
 * The date/time separator must stay a plain space: the pickers format and parse
 * their input as `"<date> <time>"`, while Maskito's default separator is `", "`
 * — with the default, re-masking on the first keystroke inserts a comma the
 * parsers reject, so edits never reach the model and revert on blur.
 *
 * @example
 * const mask = coarCreateDateTimeMask('dd.mm.yyyy', false) // "01.06.2026 14:30"
 * const mask = coarCreateDateTimeMask('mm/dd/yyyy', true)  // "06/01/2026 02:30 PM"
 * const mask = coarCreateDateTimeMask('dd.mm.yyyy', false, 'second') // "01.06.2026 14:30:05"
 */
export function coarCreateDateTimeMask(
  pattern: Pattern,
  use12Hour: boolean,
  precision: CoarTimePrecision = 'minute',
  onRefuse?: (text: string) => void,
): MaskitoOptions {
  const options = maskitoDateTimeOptionsGenerator({
    dateMode: COAR_DATE_FORMAT_TO_MASKITO_MODE[pattern],
    dateSeparator: coarGetDateSeparatorForPattern(pattern),
    timeMode: TIME_MODES[precision][use12Hour ? 1 : 0],
    dateTimeSeparator: ' ',
  });
  // The time's digits: 4 for minutes, 6 with seconds, 9 with milliseconds.
  const timeDigits = { minute: 4, second: 6, millisecond: 9 }[precision];
  const [first, last] = wholeValuePreprocessors(
    (text) => normalizeDateTime(text, pattern, use12Hour, precision),
    (data) => fitsField(data, pattern, use12Hour ? ':.,APM' : ':.,', 8 + timeDigits),
    onRefuse,
  );
  return {
    ...options,
    preprocessors: [first, ...options.preprocessors, last],
    postprocessors: withoutRollover(options.postprocessors, pattern),
  };
}
