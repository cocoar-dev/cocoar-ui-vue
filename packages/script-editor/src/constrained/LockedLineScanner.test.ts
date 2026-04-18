import { describe, expect, it } from 'vitest';
import {
  computeProtectedRanges,
  countLockedLines,
  editIsProtected,
  getEditableSegments,
  getSlot,
  getSlots,
  hasLockedMarkers,
  isEverySegmentNonEmpty,
  overlapsProtectedRange,
  scanLockedLines,
  snapOffsetAwayFromLocked,
  SLOT_MARKER_PATTERN,
  validateSource,
} from './LockedLineScanner';

describe('hasLockedMarkers', () => {
  it('detects the marker anywhere in the source', () => {
    expect(hasLockedMarkers('foo() { // @locked')).toBe(true);
    expect(hasLockedMarkers('//@locked')).toBe(true);
    expect(hasLockedMarkers('//   @locked')).toBe(true);
  });

  it('requires a word boundary after "locked"', () => {
    expect(hasLockedMarkers('// @lockedx')).toBe(false);
  });

  it('returns false for plain code', () => {
    expect(hasLockedMarkers('')).toBe(false);
    expect(hasLockedMarkers('const x = 1;')).toBe(false);
    expect(hasLockedMarkers('// locked but no @')).toBe(false);
  });
});

describe('scanLockedLines — CRLF line endings', () => {
  it('detects markers in CRLF-terminated lines', () => {
    const src = 'a\r\nfoo // @locked\r\nb';
    const locks = scanLockedLines(src);
    expect(locks).toHaveLength(1);
    expect(locks[0].lineIndex).toBe(1);
  });

  it('protected range on a CRLF line covers the `\\r` as well as the `\\n`', () => {
    const src = 'a\r\nfoo // @locked\r\nb';
    const [line] = scanLockedLines(src);
    // The \r is at position (lineEnd - 1) and should fall inside the protected range.
    // With our inclusive [lineStart, lineEnd] semantics plus >= on overlap, any edit at
    // either the \r or the \n offset is rejected.
    expect(line.protectedStart).toBeLessThanOrEqual(src.indexOf('\r', line.lineStart));
    expect(line.protectedEnd).toBeGreaterThanOrEqual(src.indexOf('\r', line.lineStart));
  });
});

describe('scanLockedLines', () => {
  it('returns one entry per locked line with inclusive offsets', () => {
    const src = 'a\nfoo // @locked\nb';
    const [line] = scanLockedLines(src);
    expect(line.lineIndex).toBe(1);
    expect(src.slice(line.lineStart, line.lineEnd)).toBe('foo // @locked');
    expect(line.protectedStart).toBe(line.lineStart);
    expect(line.protectedEnd).toBe(line.lineEnd);
  });

  it('first-line lock has null snapBefore', () => {
    const src = 'A // @locked\nb';
    const [line] = scanLockedLines(src);
    expect(line.snapBefore).toBeNull();
    expect(line.snapAfter).not.toBeNull();
  });

  it('last-line lock without trailing newline has null snapAfter', () => {
    const src = 'a\nB // @locked';
    const [line] = scanLockedLines(src);
    expect(line.snapAfter).toBeNull();
    expect(line.snapBefore).not.toBeNull();
  });

  it('middle lock has both snap targets', () => {
    const src = 'a\nB // @locked\nc';
    const [line] = scanLockedLines(src);
    expect(line.snapBefore).toBe(1); // after 'a', before '\n'
    expect(line.snapAfter).toBe(line.lineEnd + 1);
  });
});

describe('computeProtectedRanges', () => {
  it('merges adjacent locked lines into one contiguous range', () => {
    const src = 'a\nB // @locked\nC // @locked\nd';
    const merged = computeProtectedRanges(scanLockedLines(src));
    expect(merged).toHaveLength(1);
  });

  it('keeps non-adjacent locked lines as separate ranges', () => {
    const src = 'a\nB // @locked\nc\nD // @locked\ne';
    const merged = computeProtectedRanges(scanLockedLines(src));
    expect(merged).toHaveLength(2);
  });

  it('merged block uses outermost snap targets', () => {
    const src = 'a\nB // @locked\nC // @locked\nd';
    const [merged] = computeProtectedRanges(scanLockedLines(src));
    expect(merged.snapBefore).toBe(1); // after 'a'
    expect(merged.snapAfter).toBe(src.length - 1); // before 'd'
  });
});

describe('overlapsProtectedRange (inclusive)', () => {
  const range = { start: 5, end: 15, snapBefore: 4, snapAfter: 16 };

  it('rejects inserts exactly at the boundary (start)', () => {
    expect(overlapsProtectedRange({ rangeStart: 5, rangeEnd: 5 }, range)).toBe(true);
  });

  it('rejects inserts exactly at the boundary (end)', () => {
    expect(overlapsProtectedRange({ rangeStart: 15, rangeEnd: 15 }, range)).toBe(true);
  });

  it('rejects interior edits', () => {
    expect(overlapsProtectedRange({ rangeStart: 7, rangeEnd: 9 }, range)).toBe(true);
  });

  it('allows inserts strictly outside (before)', () => {
    expect(overlapsProtectedRange({ rangeStart: 4, rangeEnd: 4 }, range)).toBe(false);
  });

  it('allows inserts strictly outside (after)', () => {
    expect(overlapsProtectedRange({ rangeStart: 16, rangeEnd: 16 }, range)).toBe(false);
  });

  it('allows deletions that stop exactly at the start boundary', () => {
    // Delete [3, 5) — removes offset 3 and 4. rangeEnd is 5, which IS the protected start.
    // Since overlap uses <= / >=, rangeEnd >= range.start is true here, so this counts as overlap.
    // That's the correct behaviour: a deletion ending AT the locked line would still touch it
    // (think: Backspace at the start of a free line right after a lock would delete the `\n`
    // belonging to the lock). This test documents that.
    expect(overlapsProtectedRange({ rangeStart: 3, rangeEnd: 5 }, range)).toBe(true);
  });

  it('allows deletions strictly before the start', () => {
    expect(overlapsProtectedRange({ rangeStart: 2, rangeEnd: 4 }, range)).toBe(false);
  });
});

describe('editIsProtected', () => {
  it('short-circuits on any overlap', () => {
    const ranges = [
      { start: 5, end: 15, snapBefore: 4, snapAfter: 16 },
      { start: 30, end: 40, snapBefore: 29, snapAfter: 41 },
    ];
    expect(editIsProtected({ rangeStart: 35, rangeEnd: 38 }, ranges)).toBe(true);
    expect(editIsProtected({ rangeStart: 20, rangeEnd: 25 }, ranges)).toBe(false);
  });
});

describe('snapOffsetAwayFromLocked', () => {
  it('leaves free offsets untouched', () => {
    const ranges = [{ start: 10, end: 20, snapBefore: 9, snapAfter: 21 }];
    expect(snapOffsetAwayFromLocked(5, ranges)).toBe(5);
    expect(snapOffsetAwayFromLocked(21, ranges)).toBe(21);
  });

  it('snaps boundary offsets (inclusive "inside")', () => {
    const ranges = [{ start: 10, end: 20, snapBefore: 9, snapAfter: 21 }];
    // Offset 10 is inside the range — snap to 9 (closer).
    expect(snapOffsetAwayFromLocked(10, ranges)).toBe(9);
    // Offset 20 is inside — snap to 21 (closer).
    expect(snapOffsetAwayFromLocked(20, ranges)).toBe(21);
  });

  it('snaps interior offsets to the nearer valid boundary', () => {
    const ranges = [{ start: 10, end: 20, snapBefore: 9, snapAfter: 21 }];
    expect(snapOffsetAwayFromLocked(11, ranges)).toBe(9);
    expect(snapOffsetAwayFromLocked(19, ranges)).toBe(21);
  });

  it('uses the only valid side when one is missing', () => {
    const firstLineLock = [{ start: 0, end: 10, snapBefore: null, snapAfter: 11 }];
    expect(snapOffsetAwayFromLocked(5, firstLineLock)).toBe(11);

    const lastLineLock = [{ start: 20, end: 30, snapBefore: 19, snapAfter: null }];
    expect(snapOffsetAwayFromLocked(25, lastLineLock)).toBe(19);
  });

  it('returns 0 if no valid snap target exists (fully-locked file)', () => {
    const fullyLocked = [{ start: 0, end: 10, snapBefore: null, snapAfter: null }];
    expect(snapOffsetAwayFromLocked(5, fullyLocked)).toBe(0);
  });
});

describe('countLockedLines', () => {
  it('returns the count of locked lines', () => {
    expect(countLockedLines('a\nb')).toBe(0);
    expect(countLockedLines('x // @locked')).toBe(1);
    expect(countLockedLines('a // @locked\nb\nc // @locked')).toBe(2);
  });
});

describe('isEverySegmentNonEmpty', () => {
  it('true when every editable segment has non-whitespace', () => {
    const src =
      'import foo;\nfn() { // @locked\n  return 1;\n} // @locked\nexport {};';
    expect(isEverySegmentNonEmpty(src)).toBe(true);
  });

  it('false when any segment is whitespace-only (including trailing blanks)', () => {
    const src = 'fn() { // @locked\n  \n} // @locked';
    expect(isEverySegmentNonEmpty(src)).toBe(false);
  });

  it('true for a source with no locked lines and non-empty content', () => {
    expect(isEverySegmentNonEmpty('const x = 1;')).toBe(true);
  });
});

describe('validateSource', () => {
  it('reports ok for a well-structured template', () => {
    const src = 'imports;\nfn() { // @locked\n  body;\n} // @locked';
    const v = validateSource(src);
    expect(v.ok).toBe(true);
    expect(v.lockedLineCount).toBe(2);
    expect(v.warnings).toEqual([]);
  });

  it('warns when the source starts with a locked line', () => {
    const src = 'fn() { // @locked\n  body;\n} // @locked';
    const v = validateSource(src);
    expect(v.ok).toBe(false);
    expect(v.warnings.some((w) => w.includes('starts with a locked line'))).toBe(true);
  });

  it('warns when there is no editable space around locks', () => {
    const src = 'x // @locked\ny // @locked';
    const v = validateSource(src);
    expect(v.warnings.length).toBeGreaterThan(0);
  });
});

describe('getEditableSegments', () => {
  it('returns the whole source when nothing is locked', () => {
    expect(getEditableSegments('plain')).toEqual(['plain']);
  });

  it('splits around locked lines', () => {
    const src =
      'import foo;\n' +
      'function a() { // @locked\n' +
      '  return 1;\n' +
      '} // @locked\n' +
      'function b() { // @locked\n' +
      '  return 2;\n' +
      '} // @locked\n';
    const segs = getEditableSegments(src);
    expect(segs[0]).toContain('import foo;');
    expect(segs.some((s) => s.includes('return 1'))).toBe(true);
    expect(segs.some((s) => s.includes('return 2'))).toBe(true);
  });
});

describe('slot markers — scanner', () => {
  it('parses slotName from a locked line carrying @slot:NAME', () => {
    const src = 'function fn1(x) { // @locked @slot:fn1\n} // @locked';
    const locked = scanLockedLines(src);
    expect(locked[0].slotName).toBe('fn1');
    expect(locked[1].slotName).toBeUndefined();
  });

  it('accepts identifier chars, digits, hyphens, underscores in names', () => {
    const src =
      'a // @locked @slot:handler_1\n' +
      'b\n' +
      'c // @locked @slot:on-load-2';
    const locked = scanLockedLines(src);
    expect(locked[0].slotName).toBe('handler_1');
    expect(locked[1].slotName).toBe('on-load-2');
  });

  it('rejects names that do not start with a letter or underscore', () => {
    const src = 'a // @locked @slot:1bad';
    const locked = scanLockedLines(src);
    expect(locked[0].slotName).toBeUndefined();
  });

  it('requires the slot marker to sit on a locked line', () => {
    // A `@slot:...` marker on a free line is not a slot — the line isn't locked, so the
    // slot anchor itself could be deleted by the user. Only locked-line anchors count.
    const src = '// @slot:nope\nfunction a() { // @locked\n} // @locked';
    const locked = scanLockedLines(src);
    expect(locked.every((l) => l.slotName === undefined)).toBe(true);
  });
});

describe('getSlots', () => {
  const src =
    'function fn1(x) { // @locked @slot:fn1\n' +
    '  return x + 1;\n' +
    '} // @locked\n' +
    '\n' +
    'function fn2(x) { // @locked @slot:fn2\n' +
    '} // @locked\n' +
    '\n' +
    'function fn3(x) { // @locked @slot:fn3\n' +
    '  // user body\n' +
    '  return x * 2;\n' +
    '} // @locked\n';

  it('returns a dictionary keyed by slot name with trimmed content', () => {
    const slots = getSlots(src);
    expect(Object.keys(slots).sort()).toEqual(['fn1', 'fn2', 'fn3']);
    expect(slots.fn1).toBe('  return x + 1;');
    expect(slots.fn3).toBe('  // user body\n  return x * 2;');
  });

  it('emits empty string for slots whose body is empty or whitespace-only', () => {
    const slots = getSlots(src);
    expect(slots.fn2).toBe('');
    expect(slots.fn2.trim().length).toBe(0);
  });

  it('first-wins on duplicate slot names', () => {
    const dup =
      'a // @locked @slot:x\nfirst\nb // @locked\nc // @locked @slot:x\nsecond\nd // @locked';
    const slots = getSlots(dup);
    expect(slots.x).toBe('first');
  });

  it('returns an empty dictionary for source with no slot markers', () => {
    expect(getSlots('')).toEqual({});
    expect(getSlots('const x = 1;')).toEqual({});
    expect(getSlots('a // @locked\nb\nc // @locked')).toEqual({});
  });

  it('slot at EOF with no following lines yields empty content', () => {
    const src = 'a // @locked @slot:last';
    expect(getSlots(src)).toEqual({ last: '' });
  });
});

describe('getSlot', () => {
  const src = 'a // @locked @slot:one\nbody\nb // @locked';

  it('returns the content when the slot exists', () => {
    expect(getSlot(src, 'one')).toBe('body');
  });

  it('returns undefined when no locked line declares that name', () => {
    expect(getSlot(src, 'missing')).toBeUndefined();
  });

  it('returns empty string (not undefined) when slot exists but body is empty', () => {
    const emptyBody = 'a // @locked @slot:empty\nb // @locked';
    expect(getSlot(emptyBody, 'empty')).toBe('');
  });
});

describe('SLOT_MARKER_PATTERN', () => {
  it('is a regex source string that matches the same positions as the internal regex', () => {
    const re = new RegExp(SLOT_MARKER_PATTERN);
    expect('function f() { // @locked @slot:fn1'.match(re)?.[1]).toBe('fn1');
    expect('// @locked @slot:foo-bar_2'.match(re)?.[1]).toBe('foo-bar_2');
    expect('// @slot:no-lock-marker'.match(re)).toBeNull();
  });
});
