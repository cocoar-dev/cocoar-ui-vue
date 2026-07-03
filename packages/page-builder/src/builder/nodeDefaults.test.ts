import { describe, it, expect } from 'vitest';
import { defaultNode, uid } from './nodeDefaults';
import type { ElementType } from '../schema';

const ALL_TYPES: ElementType[] = [
  'page', 'stack', 'card', 'section', 'divider', 'spacer', 'heading',
  'paragraph', 'text-input', 'checkbox', 'select', 'button', 'link', 'image',
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

  it('creates containers with children arrays', () => {
    for (const type of ['page', 'stack', 'card', 'section'] as const) {
      expect((defaultNode(type) as { children: unknown }).children).toEqual([]);
    }
  });
});
