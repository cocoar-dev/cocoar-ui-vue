import { describe, it, expect } from 'vitest';

import { maskitoTransform } from '@maskito/core';
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
