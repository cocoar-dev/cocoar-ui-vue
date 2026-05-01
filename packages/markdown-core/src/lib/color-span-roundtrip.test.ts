import { describe, expect, it } from 'vitest';
import { parse } from './parse';
import { serialize } from './serialize';
import type { MarkdownNode } from './types';

function findFirst(
  nodes: readonly MarkdownNode[],
  predicate: (n: MarkdownNode) => boolean,
): MarkdownNode | null {
  for (const node of nodes) {
    if (predicate(node)) return node;
    if (node.children) {
      const found = findFirst(node.children, predicate);
      if (found) return found;
    }
  }
  return null;
}

describe('colorSpan round-trip', () => {
  it('parses an inline color span as colorSpan with sanitized color', () => {
    const doc = parse('Hello <span style="color: red">world</span>.');
    const span = findFirst(doc.nodes, (n) => n.type === 'colorSpan');
    expect(span).toBeTruthy();
    expect(span?.attrs?.['color']).toBe('red');
    expect(span?.children?.length).toBe(1);
    expect(span?.children?.[0]?.type).toBe('text');
    expect(span?.children?.[0]?.text).toBe('world');
  });

  it('preserves inline marks inside the color span', () => {
    const doc = parse('A <span style="color: #f00">**bold**</span> B.');
    const span = findFirst(doc.nodes, (n) => n.type === 'colorSpan');
    expect(span?.children?.[0]?.type).toBe('strong');
  });

  it('falls back to unsupported when the span fails sanitization', () => {
    const doc = parse('A <span class="x" style="color: red">word</span> B.');
    const span = findFirst(doc.nodes, (n) => n.type === 'colorSpan');
    expect(span).toBeNull();
    // The opening tag stays as an unsupported html node.
    const html = findFirst(
      doc.nodes,
      (n) => n.type === 'unsupported' && n.attrs?.['originalType'] === 'html',
    );
    expect(html).toBeTruthy();
  });

  it('handles a hex color and keeps it lower-cased', () => {
    const doc = parse('<span style="color: #ABCDEF">hex</span>');
    const span = findFirst(doc.nodes, (n) => n.type === 'colorSpan');
    expect(span?.attrs?.['color']).toBe('#abcdef');
  });

  it('serializes a colorSpan back to inline HTML', () => {
    const input = 'Hi <span style="color: #f00">red</span> bye.';
    const doc = parse(input);
    const out = serialize(doc);
    expect(out).toContain('<span style="color: #f00">');
    expect(out).toContain('red');
    expect(out).toContain('</span>');
  });

  it('round-trips a colorSpan with bold inside', () => {
    const input = 'A <span style="color: blue">**B**</span> C.';
    const doc = parse(input);
    const out = serialize(doc);
    expect(out).toContain('<span style="color: blue">');
    expect(out).toContain('**B**');
    expect(out).toContain('</span>');
  });

  it('drops malicious style declarations on parse', () => {
    const input = 'X <span style="background: url(http://evil)">y</span> Z.';
    const doc = parse(input);
    const span = findFirst(doc.nodes, (n) => n.type === 'colorSpan');
    expect(span).toBeNull();
  });

  it('handles nested color spans (inner first)', () => {
    const input = '<span style="color: red">outer <span style="color: blue">inner</span> tail</span>';
    const doc = parse(input);
    const outer = findFirst(doc.nodes, (n) => n.type === 'colorSpan');
    expect(outer?.attrs?.['color']).toBe('red');
    const inner = findFirst(outer?.children ?? [], (n) => n.type === 'colorSpan');
    expect(inner?.attrs?.['color']).toBe('blue');
  });

  it('leaves unmatched openings as unsupported nodes', () => {
    const doc = parse('A <span style="color: red">no close.');
    const span = findFirst(doc.nodes, (n) => n.type === 'colorSpan');
    expect(span).toBeNull();
  });
});
