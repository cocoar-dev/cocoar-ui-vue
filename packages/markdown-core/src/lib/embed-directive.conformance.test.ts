import { describe, expect, it } from 'vitest';
import { parse } from './parse';
import { parseEmbedDirective, serializeEmbedDirective } from './embed-directive';
import vectors from './embed-directive.conformance.json';

/**
 * Cross-platform conformance suite. The vectors in
 * `embed-directive.conformance.json` are the NORMATIVE, shared contract between
 * this package and the native Swift implementation (Cocoar.Markdown, which runs
 * the very same file through its own runner). Extend the vectors when the wire
 * behavior changes — a failure here or in the Swift CI means the two platforms
 * have drifted apart.
 */

type SegmentEntry =
  | { type: 'markdown' }
  | { type: 'embed'; key: string; props: Record<string, string> };

/**
 * Reduce a parsed document to the shared segment contract: embeds verbatim,
 * every other TOP-LEVEL block becomes an anonymous markdown entry; adjacent
 * markdown entries collapse into one. (Whitespace-only entries cannot occur
 * here — remark never emits blank top-level nodes.)
 */
function reduceToSegments(source: string): SegmentEntry[] {
  const out: SegmentEntry[] = [];
  for (const node of parse(source).nodes) {
    if (node.type === 'embed') {
      out.push({
        type: 'embed',
        key: String(node.attrs?.['key'] ?? ''),
        props: (node.attrs?.['props'] ?? {}) as Record<string, string>,
      });
    } else if (out.length === 0 || out[out.length - 1]!.type !== 'markdown') {
      out.push({ type: 'markdown' });
    }
  }
  return out;
}

describe('embed-directive conformance vectors', () => {
  describe('parse', () => {
    for (const v of vectors.parse) {
      it(v.name, () => {
        const parsed = parseEmbedDirective(v.input);
        if (v.expected === null) {
          expect(parsed).toBeNull();
        } else {
          expect(parsed).toEqual({ key: v.expected.key, props: v.expected.props });
        }
      });
    }
  });

  describe('serialize', () => {
    for (const v of vectors.serialize) {
      it(v.name, () => {
        // Object.fromEntries reproduces JS insertion-order semantics including
        // the integer-key hoisting the vectors encode.
        const props = Object.fromEntries(v.orderedProps as [string, string][]);
        expect(serializeEmbedDirective({ key: v.key, props })).toBe(v.expected);
      });
    }
  });

  describe('roundtrip', () => {
    for (const v of vectors.roundtrip) {
      it(v.name, () => {
        const parsed = parseEmbedDirective(v.input);
        expect(parsed).not.toBeNull();
        expect(serializeEmbedDirective(parsed!)).toBe(v.canonical);
      });
    }
  });

  describe('segment', () => {
    for (const v of vectors.segment) {
      it(v.name, () => {
        expect(reduceToSegments(v.input)).toEqual(v.expected);
      });
    }
  });
});
