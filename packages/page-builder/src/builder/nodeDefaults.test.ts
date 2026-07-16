import { describe, it, expect } from 'vitest';
import { cloneWithFreshIds, defaultNode, uid } from './nodeDefaults';
import type { ElementType, PageNode } from '../schema';

const ALL_TYPES: ElementType[] = [
  'page', 'stack', 'card', 'section', 'divider', 'spacer', 'heading',
  'paragraph', 'note', 'text-input', 'number-input', 'checkbox', 'switch',
  'radio-group', 'select', 'multi-select', 'otp-input', 'date-input',
  'datetime-input', 'button', 'link', 'image',
];

describe('uid', () => {
  it('never repeats — even across simulated sessions (the duplicate-id regression)', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 500; i++) ids.add(uid());
    expect(ids.size).toBe(500);
  });

  it('does not mint ids in the legacy node_N namespace', () => {
    expect(uid()).not.toMatch(/^node_\d+$/);
  });
});

describe('defaultNode', () => {
  it('creates a node for every element type with a unique id', () => {
    const ids = new Set<string>();
    for (const type of ALL_TYPES) {
      const node = defaultNode(type);
      expect(node.type).toBe(type);
      ids.add(node.id);
    }
    expect(ids.size).toBe(ALL_TYPES.length);
  });

  it('gives named inputs readable, unique field names', () => {
    const names = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const node = defaultNode('text-input') as { name?: string };
      expect(node.name).toMatch(/^field_/);
      names.add(node.name!);
    }
    expect(names.size).toBe(50);
  });

  it('emits a props bag on every element — and none on the page root', () => {
    for (const type of ALL_TYPES) {
      const node = defaultNode(type) as { props?: Record<string, unknown> };
      if (type === 'page') expect(node.props).toBeUndefined();
      else expect(node.props).toBeTypeOf('object');
    }
  });

  it('seeds choice elements with starter options', () => {
    for (const type of ['radio-group', 'select', 'multi-select'] as const) {
      const node = defaultNode(type) as { props: { options?: unknown[] } };
      expect(node.props.options).toHaveLength(2);
    }
  });

  it('creates containers with children arrays', () => {
    for (const type of ['page', 'stack', 'card', 'section'] as const) {
      expect((defaultNode(type) as { children: unknown }).children).toEqual([]);
    }
  });
});

describe('cloneWithFreshIds', () => {
  it('deep-clones with fresh ids on every node, keeping content and names', () => {
    const original: PageNode = {
      id: 's1',
      type: 'stack',
      props: {},
      children: [
        { id: 'h1', type: 'heading', props: { text: 'Title', level: 3 } },
        { id: 't1', type: 'text-input', props: {}, name: 'email', defaultValue: 'x@y.z' },
      ],
    };
    const clone = cloneWithFreshIds(original) as typeof original;

    const originalIds = ['s1', 'h1', 't1'];
    const cloneIds = [clone.id, ...clone.children.map((c) => c.id)];
    expect(cloneIds.some((id) => originalIds.includes(id))).toBe(false);
    expect(new Set(cloneIds).size).toBe(3);

    expect((clone.children[0] as { props: { text: string } }).props.text).toBe('Title');
    expect((clone.children[1] as { name?: string }).name).toBe('email');
    // The original stays untouched.
    expect(original.children[0].id).toBe('h1');
  });
});
