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

const findEmbed = (doc: { nodes: readonly MarkdownNode[] }) =>
  findFirst(doc.nodes, (n) => n.type === 'embed');

describe('embed directive parse', () => {
  it('folds a standalone `:::key{props}` line into an embed node', () => {
    const doc = parse(':::map{id=2f1c0b9e-7a4d-4c1e-9b2a-1234567890ab}');
    const embed = findEmbed(doc);
    expect(embed).toBeTruthy();
    expect(embed?.attrs?.['key']).toBe('map');
    expect(embed?.attrs?.['props']).toEqual({
      id: '2f1c0b9e-7a4d-4c1e-9b2a-1234567890ab',
    });
  });

  it('does not fold a paragraph that mixes the directive with other text', () => {
    const doc = parse('text before\n:::map{id=x}');
    expect(findEmbed(doc)).toBeNull();
    expect(doc.nodes[0]?.type).toBe('paragraph');
  });

  it('folds embeds separated by blank lines independently', () => {
    const doc = parse(':::map{id=a}\n\n:::chart{id=b}');
    const embeds = doc.nodes.filter((n) => n.type === 'embed');
    expect(embeds).toHaveLength(2);
    expect(embeds[0]?.attrs?.['key']).toBe('map');
    expect(embeds[1]?.attrs?.['key']).toBe('chart');
  });

  it('parses an embed surrounded by ordinary content', () => {
    const doc = parse('# Title\n\n:::map{id=x}\n\nAfter.');
    expect(findEmbed(doc)?.attrs?.['key']).toBe('map');
    expect(doc.nodes.map((n) => n.type)).toEqual(['heading', 'embed', 'paragraph']);
  });

  it('leaves unknown keys as valid embeds (registry-agnostic)', () => {
    const doc = parse(':::totally-made-up{a=1}');
    expect(findEmbed(doc)?.attrs?.['key']).toBe('totally-made-up');
  });
});

describe('embed directive round-trip', () => {
  for (const input of [
    ':::map{id=2f1c0b9e-7a4d-4c1e-9b2a-1234567890ab}',
    ':::chart{id=42 type=bar}',
    ':::map{id=1 title="Hello world"}',
    ':::map',
  ]) {
    it(`is byte-stable for ${input}`, () => {
      const out = serialize(parse(input));
      expect(out.trim()).toBe(input);
    });
  }

  it('reaches a fixed point after the first serialize for special-char values', () => {
    const input = ':::map{label="*hi* <b>"}';
    const once = serialize(parse(input));
    const twice = serialize(parse(once));
    expect(twice).toBe(once);
    // The value survives untouched through a full cycle.
    expect(parse(once).nodes[0]?.attrs?.['props']).toEqual({ label: '*hi* <b>' });
  });

  it('keeps an XSS-style attribute value inert and intact across round-trip', () => {
    const input = ':::map{label="</script><img onerror=alert(1)>"}';
    const doc = parse(input);
    expect(findEmbed(doc)?.attrs?.['props']).toEqual({
      label: '</script><img onerror=alert(1)>',
    });
    // Round-trips to a fixed point (verbatim html node, no markdown escaping).
    const once = serialize(doc);
    expect(serialize(parse(once))).toBe(once);
  });
});
