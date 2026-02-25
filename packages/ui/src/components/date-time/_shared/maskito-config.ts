/**
 * Maskito date/datetime mask configuration generators.
 *
 * Maps our DateFormatConfig patterns to Maskito's date mask options.
 */
import { maskitoDateOptionsGenerator, maskitoDateTimeOptionsGenerator } from '@maskito/kit';

import type { DateFormatConfig } from './types';
import { COAR_DATE_FORMAT_TO_MASKITO_MODE } from './types';
import { coarGetDateSeparatorForPattern } from './date-helpers';

/**
 * Creates a Maskito date mask for a given date format pattern.
 *
 * @example
 * const mask = coarCreateDateMask('dd.mm.yyyy') // masks "01.06.2026"
 * const mask = coarCreateDateMask('mm/dd/yyyy') // masks "06/01/2026"
 */
export function coarCreateDateMask(pattern: DateFormatConfig['pattern']) {
  return maskitoDateOptionsGenerator({
    mode: COAR_DATE_FORMAT_TO_MASKITO_MODE[pattern],
    separator: coarGetDateSeparatorForPattern(pattern),
  });
}

/**
 * Creates a Maskito datetime mask for a given date format pattern and time options.
 *
 * @example
 * const mask = coarCreateDateTimeMask('dd.mm.yyyy', false) // "01.06.2026, 14:30"
 * const mask = coarCreateDateTimeMask('mm/dd/yyyy', true)  // "06/01/2026, 2:30 PM"
 */
export function coarCreateDateTimeMask(
  pattern: DateFormatConfig['pattern'],
  use12Hour: boolean,
) {
  return maskitoDateTimeOptionsGenerator({
    dateMode: COAR_DATE_FORMAT_TO_MASKITO_MODE[pattern],
    dateSeparator: coarGetDateSeparatorForPattern(pattern),
    timeMode: use12Hour ? 'HH:MM AA' : 'HH:MM',
  });
}
