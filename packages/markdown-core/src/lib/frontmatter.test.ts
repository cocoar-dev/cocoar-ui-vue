import { describe, expect, it } from 'vitest';
import { parse } from './parse';
import { serialize } from './serialize';
import { parseFrontmatter } from './frontmatter';

const DOC = `---
name: handoff
description: Write a handoff document.
tags:
  - a
  - b
---

# Real heading

Body text.`;

describe('frontmatter — parse', () => {
  it('extracts a single frontmatter node instead of an hr + setext heading', () => {
    const doc = parse(DOC);
    const types = doc.nodes.map((n) => n.type);
    // Must be ONE frontmatter node, then the real heading + paragraph — not a
    // thematicBreak + a giant heading swallowing the whole YAML.
    expect(types).toEqual(['frontmatter', 'heading', 'paragraph']);
    expect(types).not.toContain('thematicBreak');
  });

  it('stores raw, parsed data and display entries on the node', () => {
    const fm = parse(DOC).nodes[0];
    expect(fm?.type).toBe('frontmatter');
    expect(fm?.attrs?.['raw']).toContain('name: handoff');
    const data = fm?.attrs?.['data'] as Record<string, unknown>;
    expect(data['name']).toBe('handoff');
    expect(data['tags']).toEqual(['a', 'b']);
    const entries = fm?.attrs?.['entries'] as { key: string; value: string }[];
    expect(entries).toEqual([
      { key: 'name', value: 'handoff' },
      { key: 'description', value: 'Write a handoff document.' },
      { key: 'tags', value: 'a, b' },
    ]);
  });

  it('does not treat a mid-document --- as frontmatter', () => {
    const doc = parse('# Title\n\nText\n\n---\n\nMore');
    expect(doc.nodes.map((n) => n.type)).not.toContain('frontmatter');
    expect(doc.nodes.map((n) => n.type)).toContain('thematicBreak');
  });
});

describe('frontmatter — serialize round-trip', () => {
  it('round-trips the frontmatter block back to ---…---', () => {
    const out = serialize(parse(DOC));
    expect(out).toMatch(/^---\n/);
    expect(out).toContain('name: handoff');
    expect(out).toContain('description: Write a handoff document.');
    expect(out).toContain('# Real heading');
    // Re-parsing the output yields the same top-level shape.
    expect(parse(out).nodes.map((n) => n.type)).toEqual(['frontmatter', 'heading', 'paragraph']);
  });
});

describe('parseFrontmatter helper', () => {
  it('flattens scalars, arrays and nested objects to display strings', () => {
    const { entries, data } = parseFrontmatter('a: 1\nb: true\nc:\n  - x\n  - y\nd:\n  k: v');
    expect(data).not.toBeNull();
    expect(entries).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: 'true' },
      { key: 'c', value: 'x, y' },
      { key: 'd', value: 'k: v' },
    ]);
  });

  it('returns null data + empty entries on malformed YAML (no throw)', () => {
    const { data, entries, raw } = parseFrontmatter(': : not valid : :\n  - broken');
    expect(data).toBeNull();
    expect(entries).toEqual([]);
    expect(raw).toContain('broken');
  });
});
