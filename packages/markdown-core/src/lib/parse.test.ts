import { describe, expect, it } from 'vitest';
import { parse } from './parse';

describe('parse', () => {
  it('parses basic markdown with positions and stable ids', () => {
    const doc = parse('# Title\n\nHello **world**.');
    expect(doc.nodes.length).toBeGreaterThan(0);
    expect(doc.nodes[0]?.id).toBeTruthy();
    expect(doc.nodes[0]?.position).toBeTruthy();
  });

  it('produces correct top-level node types', () => {
    const doc = parse('# Title\n\nA paragraph.\n');
    expect(doc.nodes.map((n) => n.type)).toEqual(['heading', 'paragraph']);
  });

  it('assigns deterministic IDs for the same input', () => {
    const doc1 = parse('# Title\n\nHello');
    const doc2 = parse('# Title\n\nHello');
    expect(doc1.nodes.map((n) => n.id)).toEqual(doc2.nodes.map((n) => n.id));
  });

  it('generates stable heading anchors for in-document links', () => {
    const doc = parse('# Title\n\n## Features\n\n## Features\n');
    const headings = doc.nodes.filter((n) => n.type === 'heading');
    expect(headings.length).toBe(3);
    expect(headings[0]?.attrs?.['anchor']).toBe('title');
    expect(headings[1]?.attrs?.['anchor']).toBe('features');
    expect(headings[2]?.attrs?.['anchor']).toBe('features-1');
  });

  it('parses heading depth correctly', () => {
    const doc = parse('# H1\n\n## H2\n\n### H3\n');
    const headings = doc.nodes.filter((n) => n.type === 'heading');
    expect(headings[0]?.attrs?.['depth']).toBe(1);
    expect(headings[1]?.attrs?.['depth']).toBe(2);
    expect(headings[2]?.attrs?.['depth']).toBe(3);
  });

  it('round-trips GFM table content', () => {
    const input = '| A | B |\n|---|---|\n| 1 | 2 |\n';
    const doc = parse(input);
    const table = doc.nodes.find((n) => n.type === 'table');
    expect(table).toBeTruthy();
    expect(table?.children?.length).toBe(2); // header row + data row
    expect(table?.children?.[0]?.type).toBe('tableRow');
    expect(table?.children?.[0]?.children?.length).toBe(2); // 2 cells
  });

  it('parses hard line breaks (two trailing spaces) as lineBreak nodes', () => {
    const doc = parse('Hello  \nWorld');
    expect(doc.nodes[0]?.type).toBe('paragraph');

    const children = doc.nodes[0]?.children ?? [];
    expect(children.map((c) => c.type)).toEqual(['text', 'lineBreak', 'text']);
  });

  it('resolves reference-style links and ignores definition nodes', () => {
    const input = ['[link text][ref]', '', '[ref]: https://example.com "Title"', ''].join('\n');
    const doc = parse(input);

    expect(doc.nodes.map((n) => n.type)).toEqual(['paragraph']);

    const paraChildren = doc.nodes[0]?.children ?? [];
    expect(paraChildren[0]?.type).toBe('link');
    expect(paraChildren[0]?.attrs?.['url']).toBe('https://example.com');
    expect(paraChildren[0]?.attrs?.['title']).toBe('Title');
  });

  it('resolves reference-style images', () => {
    const input = ['![Alt text][img]', '', '[img]: https://example.com/image.png "Image"', ''].join('\n');
    const doc = parse(input);

    expect(doc.nodes.map((n) => n.type)).toEqual(['paragraph']);
    const paraChildren = doc.nodes[0]?.children ?? [];

    expect(paraChildren[0]?.type).toBe('image');
    expect(paraChildren[0]?.attrs?.['url']).toBe('https://example.com/image.png');
    expect(paraChildren[0]?.attrs?.['alt']).toBe('Alt text');
    expect(paraChildren[0]?.attrs?.['title']).toBe('Image');
  });

  it('filters out definition nodes from output', () => {
    const input = '[ref]: https://example.com\n\nSome text.\n';
    const doc = parse(input);
    const types = doc.nodes.map((n) => n.type);
    expect(types).not.toContain('definition');
  });

  it('parses code blocks with language attribute', () => {
    const input = '```typescript\nconst x = 1;\n```\n';
    const doc = parse(input);
    const codeBlock = doc.nodes.find((n) => n.type === 'codeBlock');
    expect(codeBlock).toBeTruthy();
    expect(codeBlock?.attrs?.['language']).toBe('typescript');
    expect(codeBlock?.text).toBe('const x = 1;');
  });

  it('parses blockquotes', () => {
    const doc = parse('> A quote\n');
    expect(doc.nodes[0]?.type).toBe('blockquote');
    expect(doc.nodes[0]?.children?.length).toBeGreaterThan(0);
  });

  it('parses unordered lists', () => {
    const doc = parse('- Item 1\n- Item 2\n');
    const list = doc.nodes.find((n) => n.type === 'list');
    expect(list).toBeTruthy();
    expect(list?.attrs?.['ordered']).toBe(false);
    expect(list?.children?.length).toBe(2);
    expect(list?.children?.[0]?.type).toBe('listItem');
  });

  it('parses ordered lists', () => {
    const doc = parse('1. First\n2. Second\n');
    const list = doc.nodes.find((n) => n.type === 'list');
    expect(list).toBeTruthy();
    expect(list?.attrs?.['ordered']).toBe(true);
    expect(list?.children?.length).toBe(2);
  });

  it('parses task lists with checked state', () => {
    const doc = parse('- [x] Done\n- [ ] Not done\n');
    const list = doc.nodes.find((n) => n.type === 'list');
    const items = list?.children ?? [];
    expect(items[0]?.attrs?.['checked']).toBe(true);
    expect(items[1]?.attrs?.['checked']).toBe(false);
  });

  it('parses emphasis', () => {
    const doc = parse('*italic*\n');
    const para = doc.nodes[0];
    const em = para?.children?.find((c) => c.type === 'emphasis');
    expect(em).toBeTruthy();
    expect(em?.children?.[0]?.type).toBe('text');
    expect(em?.children?.[0]?.text).toBe('italic');
  });

  it('parses strong', () => {
    const doc = parse('**bold**\n');
    const para = doc.nodes[0];
    const strong = para?.children?.find((c) => c.type === 'strong');
    expect(strong).toBeTruthy();
    expect(strong?.children?.[0]?.text).toBe('bold');
  });

  it('parses strikethrough (GFM)', () => {
    const doc = parse('~~deleted~~\n');
    const para = doc.nodes[0];
    const strike = para?.children?.find((c) => c.type === 'strikethrough');
    expect(strike).toBeTruthy();
    expect(strike?.children?.[0]?.text).toBe('deleted');
  });

  it('parses inline code', () => {
    const doc = parse('Use `console.log`.\n');
    const para = doc.nodes[0];
    const code = para?.children?.find((c) => c.type === 'inlineCode');
    expect(code).toBeTruthy();
    expect(code?.text).toBe('console.log');
  });

  it('parses thematic breaks', () => {
    const doc = parse('Above\n\n---\n\nBelow\n');
    const hr = doc.nodes.find((n) => n.type === 'thematicBreak');
    expect(hr).toBeTruthy();
  });

  it('maps raw HTML to unsupported node type', () => {
    const doc = parse('<div>hello</div>\n');
    const unsupported = doc.nodes.find((n) => n.type === 'unsupported');
    expect(unsupported).toBeTruthy();
    expect(unsupported?.attrs?.['originalType']).toBe('html');
    expect(unsupported?.text).toContain('<div>');
  });

  it('disables GFM when option is false', () => {
    const input = '~~strikethrough~~\n';
    const doc = parse(input, { gfm: false });
    const para = doc.nodes[0];
    const strike = para?.children?.find((c) => c.type === 'strikethrough');
    expect(strike).toBeUndefined();
  });

  it('parses links with url and title', () => {
    const doc = parse('[Click](https://example.com "My Title")\n');
    const para = doc.nodes[0];
    const link = para?.children?.find((c) => c.type === 'link');
    expect(link).toBeTruthy();
    expect(link?.attrs?.['url']).toBe('https://example.com');
    expect(link?.attrs?.['title']).toBe('My Title');
  });

  it('parses images with url, alt, and title', () => {
    const doc = parse('![Alt](https://example.com/img.png "Title")\n');
    const para = doc.nodes[0];
    const img = para?.children?.find((c) => c.type === 'image');
    expect(img).toBeTruthy();
    expect(img?.attrs?.['url']).toBe('https://example.com/img.png');
    expect(img?.attrs?.['alt']).toBe('Alt');
    expect(img?.attrs?.['title']).toBe('Title');
  });
});
