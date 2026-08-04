import { describe, it, expect } from 'vitest';
import { cloneWithFreshIds, elementNameBase, isValidElementName, uniqueElementName, uid } from './nodeDefaults';
import type { PageNode } from '../schema';

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

describe('element names', () => {
  it('mints readable, unique Page-Code names', () => {
    expect(elementNameBase('password-input')).toBe('passwordInput');
    expect(uniqueElementName('heading', new Set(['heading', 'heading2']))).toBe('heading3');
    expect(isValidElementName('pageTitle')).toBe(true);
    expect(isValidElementName('not-valid')).toBe(false);
  });
});

describe('cloneWithFreshIds', () => {
  it('deep-clones with fresh ids on every node, keeping content and names', () => {
    const original: PageNode = {
      id: 's1',
      type: 'stack',
      name: 'formStack',
      props: {},
      children: [
        { id: 'h1', type: 'heading', name: 'title', props: { text: 'Title', level: 3 } },
        { id: 't1', type: 'text-input', props: {}, name: 'email', defaultValue: 'x@y.z' },
      ],
    };
    const clone = cloneWithFreshIds(original, new Set(['formStack', 'title', 'email'])) as typeof original;

    const originalIds = ['s1', 'h1', 't1'];
    const cloneIds = [clone.id, ...clone.children.map((c) => c.id)];
    expect(cloneIds.some((id) => originalIds.includes(id))).toBe(false);
    expect(new Set(cloneIds).size).toBe(3);

    expect((clone.children[0] as { props: { text: string } }).props.text).toBe('Title');
    expect(clone.name).toBe('formStack2');
    expect((clone.children[0] as { name?: string }).name).toBe('title2');
    expect((clone.children[1] as { name?: string }).name).toBe('email2');
    // The original stays untouched.
    expect(original.children[0].id).toBe('h1');
  });
});
