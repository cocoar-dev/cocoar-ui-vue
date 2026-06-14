import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import type { MarkdownDocument } from '@cocoar/vue-markdown-core';
import CoarMarkdown from './CoarMarkdown.vue';

const testDoc: MarkdownDocument = {
  nodes: [
    {
      id: 'h1',
      type: 'heading',
      attrs: { depth: 1, anchor: 'title' },
      children: [{ id: 't1', type: 'text', text: 'Title' }],
    },
    {
      id: 'p1',
      type: 'paragraph',
      children: [
        { id: 't2', type: 'text', text: 'See ' },
        {
          id: 'l1',
          type: 'link',
          attrs: { url: 'https://example.com' },
          children: [{ id: 't3', type: 'text', text: 'example' }],
        },
        { id: 'tImg1', type: 'text', text: ' ' },
        {
          id: 'img1',
          type: 'image',
          attrs: { url: 'https://example.com/image.png', alt: 'Alt' },
        },
        { id: 'tHash1', type: 'text', text: ' and ' },
        {
          id: 'l2',
          type: 'link',
          attrs: { url: '#title' },
          children: [{ id: 'tHash2', type: 'text', text: 'jump' }],
        },
        { id: 't4', type: 'text', text: '.' },
        { id: 'br1', type: 'lineBreak' },
        { id: 't5', type: 'text', text: 'Next line' },
      ],
    },
    {
      id: 'cb1',
      type: 'codeBlock',
      attrs: { language: 'ts' },
      text: 'const x: number = 1;\n',
    },
    {
      id: 'tbl1',
      type: 'table',
      attrs: { align: ['left', 'right'] },
      children: [
        {
          id: 'tbl1-r0',
          type: 'tableRow',
          children: [
            {
              id: 'tbl1-r0-c0',
              type: 'tableCell',
              children: [{ id: 'tbl1-r0-c0-t', type: 'text', text: 'Option' }],
            },
            {
              id: 'tbl1-r0-c1',
              type: 'tableCell',
              children: [{ id: 'tbl1-r0-c1-t', type: 'text', text: 'Value' }],
            },
          ],
        },
        {
          id: 'tbl1-r1',
          type: 'tableRow',
          children: [
            {
              id: 'tbl1-r1-c0',
              type: 'tableCell',
              children: [{ id: 'tbl1-r1-c0-t', type: 'text', text: 'foo' }],
            },
            {
              id: 'tbl1-r1-c1',
              type: 'tableCell',
              children: [{ id: 'tbl1-r1-c1-t', type: 'text', text: '123' }],
            },
          ],
        },
      ],
    },
    {
      id: 'u1',
      type: 'unsupported',
      attrs: { originalType: 'html' },
    },
  ],
};

function mountMarkdown(doc: MarkdownDocument = testDoc) {
  return mount(CoarMarkdown, { props: { doc } });
}

describe('CoarMarkdown', () => {
  it('renders external links with target=_blank and rel=noopener noreferrer', () => {
    const wrapper = mountMarkdown();
    const anchors = wrapper.findAll('a');
    const external = anchors.find((a) => a.attributes('href') === 'https://example.com');

    expect(external).toBeTruthy();
    expect(external!.attributes('target')).toBe('_blank');
    expect(external!.attributes('rel')).toBe('noopener noreferrer');
  });

  it('does not force hash anchors to open in a new tab', () => {
    const wrapper = mountMarkdown();
    const anchors = wrapper.findAll('a');
    const hash = anchors.find((a) => (a.attributes('href') ?? '').includes('#title'));

    expect(hash).toBeTruthy();
    expect(hash!.attributes('target')).toBeUndefined();
    expect(hash!.attributes('rel')).toBeUndefined();
  });

  it('renders unsupported nodes as a placeholder', () => {
    const wrapper = mountMarkdown();
    const unsupported = wrapper.find('.coar-markdown-unsupported');
    expect(unsupported.exists()).toBe(true);
    expect(unsupported.text()).toContain('Unsupported markdown node');
  });

  it('renders line breaks as <br>', () => {
    const wrapper = mountMarkdown();
    expect(wrapper.find('br').exists()).toBe(true);
  });

  it('renders code blocks via CoarCodeBlock', () => {
    const wrapper = mountMarkdown();
    const codeBlock = wrapper.find('.coar-code-block');
    expect(codeBlock.exists()).toBe(true);
  });

  it('renders images with src and alt', () => {
    const wrapper = mountMarkdown();
    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://example.com/image.png');
    expect(img.attributes('alt')).toBe('Alt');
  });

  it('renders tables with header cells and alignment classes', () => {
    const wrapper = mountMarkdown();

    const ths = wrapper.findAll('th');
    expect(ths.length).toBe(2);
    expect(ths[0].text()).toBe('Option');
    expect(ths[1].text()).toBe('Value');
    expect(ths[1].classes()).toContain('text-right');

    const tds = wrapper.findAll('td');
    expect(tds.length).toBe(2);
    expect(tds[0].text()).toBe('foo');
    expect(tds[1].text()).toBe('123');
    expect(tds[1].classes()).toContain('text-right');
  });
});

// Spread the Cocoar defaults so unrelated nodes (text, paragraph, etc.) keep
// rendering normally — we only swap one slot at a time.
import { defineComponent, h } from 'vue';
import { defaultMarkdownRenderers, type MarkdownViewerRenderers } from './index';

describe('CoarMarkdown — renderers prop override', () => {
  const tinyDoc = {
    nodes: [
      {
        id: 'h',
        type: 'heading',
        attrs: { depth: 2 },
        children: [{ id: 't', type: 'text', text: 'Title' }],
      },
      {
        id: 'p',
        type: 'paragraph',
        children: [{ id: 'pt', type: 'text', text: 'Body' }],
      },
    ],
  };

  it('uses the override component for matching node types', () => {
    // Custom paragraph that wraps the content in a marked div so the test
    // can assert the override actually fired.
    const CustomParagraph = defineComponent({
      name: 'CustomParagraph',
      props: { node: { type: Object, required: true }, renderChildren: { type: Function, required: true }, renderNodes: { type: Function, required: true } },
      setup(props) {
        return () =>
          h('div', { 'data-testid': 'custom-paragraph' }, props.renderChildren());
      },
    });
    const renderers: MarkdownViewerRenderers = {
      ...defaultMarkdownRenderers,
      // Generic Vue Component type inferred from defineComponent doesn't
      // structurally match MarkdownRenderer<MarkdownNode> — cast through.
      paragraph: CustomParagraph as unknown as MarkdownViewerRenderers['paragraph'],
    };

    const wrapper = mount(CoarMarkdown, {
      props: { doc: tinyDoc, renderers },
    });

    const custom = wrapper.find('[data-testid="custom-paragraph"]');
    expect(custom.exists()).toBe(true);
    expect(custom.text()).toBe('Body');
    // Heading isn't overridden — still renders as <h2>.
    expect(wrapper.find('h2').text()).toBe('Title');
  });

  it('renders defaults when no override is provided', () => {
    const wrapper = mount(CoarMarkdown, { props: { doc: tinyDoc } });
    // No override — default paragraph renderer wraps in <p>.
    expect(wrapper.find('p').text()).toBe('Body');
    expect(wrapper.find('[data-testid="custom-paragraph"]').exists()).toBe(false);
  });

  it('renders colorSpan as <span> with sanitized inline color', () => {
    const wrapper = mount(CoarMarkdown, {
      props: {
        doc: {
          nodes: [
            {
              id: 'p',
              type: 'paragraph',
              children: [
                { id: 't1', type: 'text', text: 'before ' },
                {
                  id: 'cs1',
                  type: 'colorSpan',
                  attrs: { color: '#ff0000' },
                  children: [{ id: 't2', type: 'text', text: 'red' }],
                },
                { id: 't3', type: 'text', text: ' after' },
              ],
            },
          ],
        },
      },
    });
    const span = wrapper.find('span.coar-markdown-color');
    expect(span.exists()).toBe(true);
    expect(span.text()).toBe('red');
    expect(span.attributes('style') ?? '').toContain('color');
    expect(span.attributes('style') ?? '').toContain('#ff0000');
  });

  it('strips a colorSpan style when the color attr fails sanitization', () => {
    const wrapper = mount(CoarMarkdown, {
      props: {
        doc: {
          nodes: [
            {
              id: 'p',
              type: 'paragraph',
              children: [
                {
                  id: 'cs',
                  type: 'colorSpan',
                  attrs: { color: 'url(http://evil)' },
                  children: [{ id: 't', type: 'text', text: 'bad' }],
                },
              ],
            },
          ],
        },
      },
    });
    const span = wrapper.find('span.coar-markdown-color');
    expect(span.exists()).toBe(true);
    expect(span.attributes('style')).toBeFalsy();
  });
});

import { parse } from '@cocoar/vue-markdown-core';

describe('CoarMarkdown — frontmatter', () => {
  it('renders a YAML frontmatter block as a metadata card (key/value rows)', () => {
    const doc = parse('---\nname: handoff\ndescription: Do a thing\n---\n\n# Heading\n');
    const wrapper = mount(CoarMarkdown, { props: { doc } });

    const card = wrapper.find('.coar-markdown-frontmatter');
    expect(card.exists()).toBe(true);

    const keys = wrapper.findAll('.coar-markdown-frontmatter__key').map((n) => n.text());
    const values = wrapper.findAll('.coar-markdown-frontmatter__value').map((n) => n.text());
    expect(keys).toEqual(['name', 'description']);
    expect(values).toEqual(['handoff', 'Do a thing']);

    // The real heading still renders as a normal <h1> — the frontmatter did NOT
    // swallow the document into one giant heading.
    expect(wrapper.find('h1').text()).toBe('Heading');
    // And the whole YAML is NOT dumped as one collapsed line of text.
    expect(card.text()).not.toContain('--- name: handoff');
  });

  it('falls back to raw text for unparseable YAML instead of collapsing', () => {
    const wrapper = mount(CoarMarkdown, {
      props: {
        doc: { nodes: [{ id: 'fm', type: 'frontmatter', attrs: { raw: 'broken: : :', data: null, entries: [] } }] },
      },
    });
    expect(wrapper.find('.coar-markdown-frontmatter__list').exists()).toBe(false);
    expect(wrapper.find('.coar-markdown-frontmatter__raw').text()).toContain('broken: : :');
  });
});
