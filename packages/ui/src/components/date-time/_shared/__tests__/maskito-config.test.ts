import { describe, it, expect } from 'vitest';

import { maskitoTransform } from '@maskito/core';

import { coarCreateDateMask, coarCreateDateTimeMask } from '../maskito-config';

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
