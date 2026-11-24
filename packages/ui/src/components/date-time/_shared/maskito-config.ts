/**
 * Maskito date/datetime mask configuration generators.
 *
 * Maps our DateFormatConfig patterns to Maskito's date mask options, and keeps
 * the mask from changing what was entered: the pickers parse the text and
 * refuse what is not a value, so the mask must hand them the text as written.
 */
import type { MaskitoOptions, MaskitoPostprocessor, MaskitoPreprocessor } from '@maskito/core';
import { maskitoDateOptionsGenerator, maskitoDateTimeOptionsGenerator } from '@maskito/kit';

import type { DateFormatConfig } from './types';
import { COAR_DATE_FORMAT_TO_MASKITO_MODE } from './types';
import { coarFormatPlainDate, coarGetDateSeparatorForPattern, coarParsePlainDateFromInput } from './date-helpers';
import { coarFormatTime, coarParseTimeInput } from './time-helpers';

type Pattern = DateFormatConfig['pattern'];

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
 */
function wholeValuePreprocessors(
  normalize: (text: string) => string | null,
): [first: MaskitoPreprocessor, last: MaskitoPreprocessor] {
  let whole: string | null = null;
  const first: MaskitoPreprocessor = ({ elementState, data }, actionType) => {
    whole = null;
    if (actionType === 'insert' && data.length > 1) {
      const [from, to] = elementState.selection;
      whole = normalize((elementState.value.slice(0, from) + data + elementState.value.slice(to)).trim());
    }
    return { elementState, data };
  };
  const last: MaskitoPreprocessor = ({ elementState, data }) => {
    if (whole === null) return { elementState, data };
    const value = whole;
    whole = null;
    return { elementState: { value: '', selection: [0, 0] }, data: value };
  };
  return [first, last];
}

function normalizeDate(text: string, pattern: Pattern): string | null {
  const date = coarParsePlainDateFromInput(text, pattern);
  return date ? coarFormatPlainDate(date, pattern) : null;
}

/** "<date> <time>", also with a comma or several spaces between them, the time in 12 or 24 hours. */
function normalizeDateTime(text: string, pattern: Pattern, use12Hour: boolean): string | null {
  const match = text.match(/^(\S+?),?\s+(.+)$/);
  if (!match) return null;
  const date = normalizeDate(match[1], pattern);
  const time = coarParseTimeInput(match[2]);
  if (!date || !time) return null;
  return `${date} ${coarFormatTime(time.hours, time.minutes, !use12Hour, true)}`;
}

/**
 * Creates a Maskito date mask for a given date format pattern.
 *
 * @example
 * const mask = coarCreateDateMask('dd.mm.yyyy') // masks "01.06.2026"
 * const mask = coarCreateDateMask('mm/dd/yyyy') // masks "06/01/2026"
 */
export function coarCreateDateMask(pattern: Pattern): MaskitoOptions {
  const options = maskitoDateOptionsGenerator({
    mode: COAR_DATE_FORMAT_TO_MASKITO_MODE[pattern],
    separator: coarGetDateSeparatorForPattern(pattern),
  });
  const [first, last] = wholeValuePreprocessors((text) => normalizeDate(text, pattern));
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
 */
export function coarCreateDateTimeMask(pattern: Pattern, use12Hour: boolean): MaskitoOptions {
  const options = maskitoDateTimeOptionsGenerator({
    dateMode: COAR_DATE_FORMAT_TO_MASKITO_MODE[pattern],
    dateSeparator: coarGetDateSeparatorForPattern(pattern),
    timeMode: use12Hour ? 'HH:MM AA' : 'HH:MM',
    dateTimeSeparator: ' ',
  });
  const [first, last] = wholeValuePreprocessors((text) => normalizeDateTime(text, pattern, use12Hour));
  return {
    ...options,
    preprocessors: [first, ...options.preprocessors, last],
    postprocessors: withoutRollover(options.postprocessors, pattern),
  };
}
