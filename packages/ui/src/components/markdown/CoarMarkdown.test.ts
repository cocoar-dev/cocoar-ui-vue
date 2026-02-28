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
