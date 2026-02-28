import { describe, expect, it } from 'vitest';
import { transform } from './transform';
import type { MarkdownDocument, MarkdownTransform } from './types';

describe('transform', () => {
  const baseDoc: MarkdownDocument = {
    nodes: [
      { id: '1', type: 'paragraph', text: 'hello' },
    ],
  };

  it('applies a single transform', () => {
    const upper: MarkdownTransform = (doc) => ({
      ...doc,
      nodes: doc.nodes.map((n) => ({ ...n, text: n.text?.toUpperCase() })),
    });

    const result = transform(baseDoc, upper);
    expect(result.nodes[0]?.text).toBe('HELLO');
  });

  it('composes multiple transforms in order', () => {
    const addSuffix: MarkdownTransform = (doc) => ({
      ...doc,
      nodes: doc.nodes.map((n) => ({ ...n, text: (n.text ?? '') + '-a' })),
    });
    const addSuffix2: MarkdownTransform = (doc) => ({
      ...doc,
      nodes: doc.nodes.map((n) => ({ ...n, text: (n.text ?? '') + '-b' })),
    });

    const result = transform(baseDoc, addSuffix, addSuffix2);
    expect(result.nodes[0]?.text).toBe('hello-a-b');
  });

  it('returns original doc when no transforms are provided', () => {
    const result = transform(baseDoc);
    expect(result).toBe(baseDoc);
  });
});
