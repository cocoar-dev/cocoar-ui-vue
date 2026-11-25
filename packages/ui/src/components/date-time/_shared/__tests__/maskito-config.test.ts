import { describe, it, expect } from 'vitest';

import { maskitoPipe, maskitoTransform, type MaskitoOptions } from '@maskito/core';
import { Temporal } from '@js-temporal/polyfill';

import { coarCreateDateMask, coarCreateDateTimeMask } from '../maskito-config';
import { coarFormatPlainDate, coarParsePlainDateFromInput } from '../date-helpers';
import { coarFormatTime, coarParseTimeInput } from '../time-helpers';
import type { DateFormatConfig } from '../types';

const ALL_PATTERNS: DateFormatConfig['pattern'][] = [
  'dd.mm.yyyy',
  'dd/mm/yyyy',
  'mm/dd/yyyy',
  'yyyy-mm-dd',
];

describe('coarCreateDateMask', () => {
  it('masks a complete date for each pattern', () => {
    expect(maskitoTransform('01.09.2026', coarCreateDateMask('dd.mm.yyyy'))).toBe('01.09.2026');
    expect(maskitoTransform('09/01/2026', coarCreateDateMask('mm/dd/yyyy'))).toBe('09/01/2026');
    expect(maskitoTransform('2026-09-01', coarCreateDateMask('yyyy-mm-dd'))).toBe('2026-09-01');
  });
});

describe('coarCreateDateTimeMask', () => {
  // The pickers format and parse "<date> <time>" with a plain space. Maskito's
  // default date/time separator is ", " — if the mask ever falls back to it,
  // the first keystroke re-masks the value with a comma, parsing fails, and
  // edits revert on blur.
  it('keeps the plain-space separator the pickers format with (24h)', () => {
    const mask = coarCreateDateTimeMask('dd.mm.yyyy', false);
    expect(maskitoTransform('01.09.2026 08:30', mask)).toBe('01.09.2026 08:30');
  });

  it('keeps the plain-space separator the pickers format with (12h)', () => {
    const mask = coarCreateDateTimeMask('dd.mm.yyyy', true);
    // Maskito emits a no-break space before the meridiem.
    expect(maskitoTransform('01.09.2026 08:30 PM', mask)).toBe('01.09.2026 08:30\u00a0PM');
  });

  it('normalizes a pasted comma separator to a space', () => {
    const mask = coarCreateDateTimeMask('dd.mm.yyyy', false);
    expect(maskitoTransform('01.09.2026, 08:30', mask)).toBe('01.09.2026 08:30');
  });

  it('inserts separators when typing bare digits', () => {
    const mask = coarCreateDateTimeMask('dd.mm.yyyy', false);
    expect(maskitoTransform('010920260830', mask)).toBe('01.09.2026 08:30');
  });
});

// The blur-revert contract of every masked picker: the text the picker writes
// must survive a re-mask byte-for-byte (else typing rewrites it and the cursor
// jumps) and must parse back to the same value (else edits revert on blur).
describe('mask ↔ format ↔ parse round-trips', () => {
  const date = Temporal.PlainDate.from('2026-09-01');

  it.each(ALL_PATTERNS)('date-only round-trip for %s', (pattern) => {
    const text = coarFormatPlainDate(date, pattern);
    expect(maskitoTransform(text, coarCreateDateMask(pattern))).toBe(text);
    expect(coarParsePlainDateFromInput(text, pattern)?.toString()).toBe(date.toString());
  });

  it.each(ALL_PATTERNS)('datetime 24h round-trip for %s', (pattern) => {
    const text = `${coarFormatPlainDate(date, pattern)} ${coarFormatTime(8, 30, true, true)}`;
    expect(maskitoTransform(text, coarCreateDateTimeMask(pattern, false))).toBe(text);

    // CoarZonedDateTimePicker splits on /\s+/, CoarPlainDateTimePicker on ' '.
    for (const parts of [text.trim().split(/\s+/), text.split(' ')]) {
      expect(coarParsePlainDateFromInput(parts[0], pattern)?.toString()).toBe(date.toString());
      expect(coarParseTimeInput(parts.slice(1).join(' '))).toEqual({ hours: 8, minutes: 30 });
    }
  });

  it.each(ALL_PATTERNS)('datetime 12h round-trip for %s', (pattern) => {
    const text = `${coarFormatPlainDate(date, pattern)} ${coarFormatTime(20, 30, false, true)}`;
    expect(maskitoTransform(text, coarCreateDateTimeMask(pattern, true))).toBe(text);

    for (const parts of [text.trim().split(/\s+/), text.split(' ')]) {
      expect(coarParsePlainDateFromInput(parts[0], pattern)?.toString()).toBe(date.toString());
      expect(coarParseTimeInput(parts.slice(1).join(' '))).toEqual({ hours: 20, minutes: 30 });
    }
  });
});

// What Maskito does in the browser for a paste, a drop or a `fill`: the
// preprocessors get the inserted text as `data`, the mask then takes the rest.
function insert(text: string, options: MaskitoOptions, value = ''): string {
  const { elementState, data } = maskitoPipe(options.preprocessors!)(
    { elementState: { value, selection: [0, value.length] }, data: text },
    'insert',
  );
  const state = { value: elementState.value.slice(0, elementState.selection[0]) + data + elementState.value.slice(elementState.selection[1]), selection: elementState.selection };
  return maskitoTransform(state, options).value;
}

describe('an impossible calendar day stays as typed (#109)', () => {
  // Maskito's min/max step used to turn it into a JS Date: 30.02.2026 → 02.03.2026.
  it.each([
    ['dd.mm.yyyy', '30.02.2026'],
    ['mm/dd/yyyy', '02/30/2026'],
    ['dd.mm.yyyy', '29.02.2026'],
    ['yyyy-mm-dd', '2026-04-31'],
  ] as const)('date mask %s keeps %s', (pattern, text) => {
    expect(maskitoTransform(text, coarCreateDateMask(pattern))).toBe(text);
  });

  it('keeps a leap day', () => {
    expect(maskitoTransform('29.02.2028', coarCreateDateMask('dd.mm.yyyy'))).toBe('29.02.2028');
  });

  it('keeps the impossible day while the time is typed and when it is complete', () => {
    const mask = coarCreateDateTimeMask('dd.mm.yyyy', false);
    expect(maskitoTransform('30.02.2026 1', mask)).toBe('30.02.2026 1');
    expect(maskitoTransform('30.02.2026 10:30', mask)).toBe('30.02.2026 10:30');
  });
});

describe('a value inserted at once keeps what it says (#110)', () => {
  const mask = coarCreateDateTimeMask('mm/dd/yyyy', true);

  it.each([
    ['07/01/2026 03:46 PM', '07/01/2026 03:46\u00a0PM'],
    ['07/01/2026 12:00 AM', '07/01/2026 12:00\u00a0AM'],
    ['07/01/2026 12:00 PM', '07/01/2026 12:00\u00a0PM'],
    ['07/01/2026 3:46 pm', '07/01/2026 03:46\u00a0PM'],
    ['07/01/2026, 15:46', '07/01/2026 03:46\u00a0PM'],
  ])('%s', (text, expected) => {
    expect(insert(text, mask)).toBe(expected);
    expect(coarParseTimeInput(expected.split(' ').slice(1).join(' '))).toEqual(coarParseTimeInput(text.split(/,?\s+/).slice(1).join(' ')));
  });

  it('replaces a selected value', () => {
    expect(insert('07/01/2026 03:46 PM', mask, '01/02/2026 08:00\u00a0AM')).toBe('07/01/2026 03:46\u00a0PM');
  });

  it('reads a 12-hour value in a 24-hour field', () => {
    expect(insert('01.07.2026 03:46 PM', coarCreateDateTimeMask('dd.mm.yyyy', false))).toBe('01.07.2026 15:46');
  });

  it('keeps seconds and milliseconds in a field that shows them (#111)', () => {
    const mask = coarCreateDateTimeMask('dd.mm.yyyy', false, 'millisecond');
    expect(insert('01.07.2026 15:46:56.123', mask)).toBe('01.07.2026 15:46:56.123');
    expect(insert('01.07.2026 15:46', mask)).toBe('01.07.2026 15:46:00.000');
    expect(maskitoTransform('01.07.2026 15:46:56.123', mask)).toBe('01.07.2026 15:46:56.123');
    const twelve = coarCreateDateTimeMask('mm/dd/yyyy', true, 'second');
    expect(insert('07/01/2026 03:46:56 PM', twelve)).toBe('07/01/2026 03:46:56\u00a0PM');
  });

  it('refuses a value more precise than the field instead of cutting it (#111)', () => {
    const refused: string[] = [];
    const mask = coarCreateDateTimeMask('dd.mm.yyyy', false, 'minute', (text) => refused.push(text));
    const { data } = maskitoPipe(mask.preprocessors!)(
      { elementState: { value: '', selection: [0, 0] }, data: '01.07.2026 15:46:56' },
      'insert',
    );
    expect(data).toBe('');
    expect(refused).toEqual(['01.07.2026 15:46:56']);
  });

  it('inserts a whole date', () => {
    expect(insert('01.07.2026', coarCreateDateMask('dd.mm.yyyy'))).toBe('01.07.2026');
  });
});
