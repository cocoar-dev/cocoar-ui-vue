import { describe, it, expect } from 'vitest';
import { cloneWithFreshIds, fieldName, uid } from './nodeDefaults';
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

describe('fieldName', () => {
  it('mints readable, unique field keys', () => {
    const names = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const name = fieldName();
      expect(name).toMatch(/^field_/);
      names.add(name);
    }
    expect(names.size).toBe(50);
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
