import { describe, expect, it } from 'vitest';
import { parse } from './parse';
import { serialize } from './serialize';

describe('serialize', () => {
  it('round-trips basic markdown', () => {
    const input = '# Hello\n\nA paragraph.\n';
    const doc = parse(input);
    const output = serialize(doc);
    expect(output).toContain('# Hello');
    expect(output).toContain('A paragraph.');
  });

  it('serializes headings with correct depth', () => {
    const input = '# H1\n\n## H2\n\n### H3\n';
    const doc = parse(input);
    const output = serialize(doc);
    expect(output).toContain('# H1');
    expect(output).toContain('## H2');
    expect(output).toContain('### H3');
  });

  it('serializes unordered lists', () => {
    const input = '* Item 1\n\n* Item 2\n';
    const doc = parse(input);
    const output = serialize(doc);
    expect(output).toContain('Item 1');
    expect(output).toContain('Item 2');
  });

  it('serializes ordered lists', () => {
    const input = '1. First\n\n2. Second\n';
    const doc = parse(input);
    const output = serialize(doc);
    expect(output).toContain('1.');
    expect(output).toContain('First');
    expect(output).toContain('2.');
    expect(output).toContain('Second');
  });

  it('serializes code blocks with language', () => {
    const input = '```js\nconst x = 1;\n```\n';
    const doc = parse(input);
    const output = serialize(doc);
    expect(output).toContain('```js');
    expect(output).toContain('const x = 1;');
  });

  it('round-trips GFM tables', () => {
    const input = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
    const doc = parse(input);
    const output = serialize(doc);
    expect(output).toContain('| A | B |');
    expect(output).toContain('| 1 | 2 |');
  });

  it('serializes strikethrough (GFM)', () => {
    const input = '~~deleted~~\n';
    const doc = parse(input);
    const output = serialize(doc);
    expect(output).toContain('~~deleted~~');
  });

  it('serializes task lists (GFM)', () => {
    const input = '* [x] Done\n\n* [ ] Not done\n';
    const doc = parse(input);
    const output = serialize(doc);
    expect(output).toContain('[x]');
    expect(output).toContain('[ ]');
  });
});
