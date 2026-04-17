/**
 * Line-based locking.
 *
 * Any line containing `// @locked` (optionally followed by more text) is protected:
 * the user cannot edit, merge, or delete that line. The marker is an ordinary line
 * comment, so the locked source is a valid `.ts`/`.js` file in any toolchain.
 *
 *   function describeOrder(order: Order): string { // @locked
 *     return 'hi';
 *   } // @locked
 *
 * Matches are case-sensitive and require a word boundary after `locked` so lines like
 * `// @lockedx` do not trigger.
 */

const LOCKED_MARKER = /\/\/\s*@locked\b/;

export const LOCKED_MARKER_TEXT = '// @locked';

export interface LockedLine {
  /** 0-based line index within the source. */
  lineIndex: number;
  /** First offset of the line (character immediately after the previous `\n`, or 0). */
  lineStart: number;
  /**
   * Offset of the `\n` terminating the line, or `source.length` for the last line with no
   * trailing newline. This is an **inclusive** upper bound on the protected range — inserts
   * and deletes that touch this offset belong to the locked line.
   */
  lineEnd: number;
  /**
   * Start offset of the protected range. Equals `lineStart` — an insertion at this offset
   * extends the locked line's content, so it is protected.
   */
  protectedStart: number;
  /**
   * End offset of the protected range, **inclusive**. Equals `lineEnd`. An insertion at
   * this offset extends the locked line's content (before the `\n`), a deletion of this
   * offset removes the `\n` and merges the next line in — both protected.
   */
  protectedEnd: number;
  /** Valid snap target before the locked line (end of the previous line), or null if this is the first line. */
  snapBefore: number | null;
  /** Valid snap target after the locked line (start of the next line), or null if this is the last line with no trailing `\n`. */
  snapAfter: number | null;
}

/** Contiguous protected range, produced by merging adjacent locked lines. */
export interface ProtectedRange {
  start: number;
  end: number;
  /** Valid snap target before the block, or null if the block starts at file begin. */
  snapBefore: number | null;
  /** Valid snap target after the block, or null if the block ends at file end with no trailing `\n`. */
  snapAfter: number | null;
}

export function hasLockedMarkers(source: string): boolean {
  return LOCKED_MARKER.test(source);
}

export function scanLockedLines(source: string): LockedLine[] {
  const result: LockedLine[] = [];
  const length = source.length;
  let lineIndex = 0;
  let lineStart = 0;

  for (let i = 0; i <= length; i++) {
    if (i === length || source[i] === '\n') {
      const lineEnd = i;
      // Support CRLF: if the previous character is `\r`, treat the protected range as if
      // the line ended there, so an insert at the `\r` offset (right before the `\n`) is
      // still treated as touching the locked line.
      const contentEnd = lineEnd > lineStart && source[lineEnd - 1] === '\r' ? lineEnd - 1 : lineEnd;
      const line = source.slice(lineStart, contentEnd);
      if (LOCKED_MARKER.test(line)) {
        result.push({
          lineIndex,
          lineStart,
          lineEnd,
          protectedStart: lineStart,
          protectedEnd: lineEnd,
          snapBefore: lineStart === 0 ? null : lineStart - 1,
          snapAfter: lineEnd >= length ? null : lineEnd + 1,
        });
      }
      lineStart = i + 1;
      lineIndex++;
    }
  }
  return result;
}

/**
 * Merge adjacent locked lines into contiguous blocks. Two locks are adjacent when the next
 * one begins exactly one character after the previous one ends (the `\n` between them). The
 * resulting `ProtectedRange`s propagate the outermost `snapBefore` / `snapAfter`.
 */
export function computeProtectedRanges(lines: readonly LockedLine[]): ProtectedRange[] {
  if (lines.length === 0) return [];
  const sorted = [...lines].sort((a, b) => a.protectedStart - b.protectedStart);
  const merged: ProtectedRange[] = [];
  let current: ProtectedRange = {
    start: sorted[0].protectedStart,
    end: sorted[0].protectedEnd,
    snapBefore: sorted[0].snapBefore,
    snapAfter: sorted[0].snapAfter,
  };
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    // Adjacent (touching at the `\n`) or overlapping: absorb. `current.end + 1 === next.start`
    // is the typical "two locked lines in a row" case.
    if (next.protectedStart <= current.end + 1) {
      current.end = Math.max(current.end, next.protectedEnd);
      current.snapAfter = next.snapAfter;
    } else {
      merged.push(current);
      current = {
        start: next.protectedStart,
        end: next.protectedEnd,
        snapBefore: next.snapBefore,
        snapAfter: next.snapAfter,
      };
    }
  }
  merged.push(current);
  return merged;
}

/**
 * Inclusive overlap test: does an edit `[rangeStart, rangeEnd]` touch the protected range
 * `[range.start, range.end]`? Uses inclusive bounds on both sides — an insertion exactly at
 * `range.start` or `range.end` counts as overlap, because both positions would extend the
 * locked line's content.
 */
export function overlapsProtectedRange(
  edit: { rangeStart: number; rangeEnd: number },
  range: ProtectedRange,
): boolean {
  return edit.rangeStart <= range.end && edit.rangeEnd >= range.start;
}

export function editIsProtected(
  edit: { rangeStart: number; rangeEnd: number },
  ranges: readonly ProtectedRange[],
): boolean {
  return ranges.some((r) => overlapsProtectedRange(edit, r));
}

/**
 * Snap an offset away from protected territory. If the offset lies inside any protected
 * range (inclusive), snap to the nearer valid free position. For first-line locks the only
 * valid target is `snapAfter`; for last-line locks without a trailing `\n`, only `snapBefore`
 * is valid. Returns `0` as ultimate fallback if neither side is valid (fully-locked file).
 */
export function snapOffsetAwayFromLocked(
  offset: number,
  ranges: readonly ProtectedRange[],
): number {
  for (const r of ranges) {
    if (offset >= r.start && offset <= r.end) {
      const before = r.snapBefore;
      const after = r.snapAfter;
      if (before == null && after == null) return 0;
      if (before == null) return after as number;
      if (after == null) return before;
      return offset - before < after - offset ? before : after;
    }
  }
  return offset;
}

/** Number of lines that carry a `// @locked` marker. */
export function countLockedLines(source: string): number {
  return scanLockedLines(source).length;
}

/**
 * Common submit-gate check: true when every editable segment contains at least one
 * non-whitespace character. "Every body has been filled in."
 */
export function isEverySegmentNonEmpty(source: string): boolean {
  return getEditableSegments(source).every((s) => s.trim().length > 0);
}

export interface SourceValidation {
  /** Always present — the scanner never throws. Indicates whether any warnings surfaced. */
  ok: boolean;
  lockedLineCount: number;
  segmentCount: number;
  /**
   * Informational warnings the consumer may want to surface. Examples:
   * "source starts with a locked line — imports cannot be added above it".
   */
  warnings: string[];
}

/**
 * Quick structural check for a template or persisted source. Non-throwing; use it when you
 * want to surface soft warnings (e.g. during template authoring) without refusing to mount.
 */
export function validateSource(source: string): SourceValidation {
  const lines = scanLockedLines(source);
  const segments = getEditableSegments(source);
  const warnings: string[] = [];

  if (lines.length > 0 && lines[0].lineIndex === 0) {
    warnings.push(
      'Source starts with a locked line — there is no space above for auto-import or helpers.',
    );
  }
  if (lines.length > 0 && segments.every((s) => s.length === 0)) {
    warnings.push('Source has locked lines but no editable space between or around them.');
  }

  return {
    ok: warnings.length === 0,
    lockedLineCount: lines.length,
    segmentCount: segments.length,
    warnings,
  };
}

/**
 * Returns the text of each *editable* block — the stretches of consecutive non-locked
 * lines. If the source has no locked lines, returns a single-element array with the full
 * source. Useful for validation like "every block contains at least one non-empty line".
 */
export function getEditableSegments(source: string): string[] {
  const locked = scanLockedLines(source);
  if (locked.length === 0) return [source];

  const lockedSet = new Set<number>(locked.map((l) => l.lineIndex));
  const allLines = source.split('\n');
  const segments: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < allLines.length; i++) {
    if (lockedSet.has(i)) {
      if (current.length > 0 || segments.length === 0) {
        segments.push(current.join('\n'));
        current = [];
      } else {
        segments.push('');
      }
    } else {
      current.push(allLines[i]);
    }
  }
  segments.push(current.join('\n'));
  return segments;
}
