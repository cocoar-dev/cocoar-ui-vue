import { describe, it, expect } from 'vitest';
import { migrateLegacyTypes, normalizePageSchema } from './schemaNormalize';
import type { PageNode } from '../schema';

const validPage: PageNode = {
  id: 'root',
  type: 'page',
  schemaVersion: 1,
  children: [
    { id: 'h', type: 'heading', text: 'Hello', level: 2 },
    { id: 's', type: 'stack', children: [{ id: 'p', type: 'paragraph', text: 'Hi' }] },
  ],
};

describe('migrateLegacyTypes', () => {
  it('migrates column/row to stack with the matching direction', () => {
    const legacy = {
      id: 'r',
      type: 'column',
      children: [{ id: 'x', type: 'row', children: [] }],
    };
    const migrated = migrateLegacyTypes(legacy) as {
      type: string;
      direction: string;
      children: { type: string; direction: string }[];
    };
    expect(migrated.type).toBe('stack');
    expect(migrated.direction).toBe('column');
    expect(migrated.children[0].type).toBe('stack');
    expect(migrated.children[0].direction).toBe('row');
  });

  it('returns the same reference when nothing needs migration', () => {
    expect(migrateLegacyTypes(validPage)).toBe(validPage);
  });
});

describe('normalizePageSchema — healing', () => {
  it('returns the same reference for an already-valid schema', () => {
    const { schema, issues, changed } = normalizePageSchema(validPage);
    expect(schema).toBe(validPage);
    expect(issues).toEqual([]);
    expect(changed).toBe(false);
  });

  it('wraps a non-page root in a page (with a stamped schemaVersion)', () => {
    const { schema, issues, changed } = normalizePageSchema({
      id: 'c',
      type: 'card',
      children: [],
    });
    expect(schema.type).toBe('page');
    expect((schema as { schemaVersion?: number }).schemaVersion).toBe(1);
    expect((schema as { children: PageNode[] }).children[0].type).toBe('card');
    expect(issues).toEqual([]);
    expect(changed).toBe(true);
  });

  it('stamps schemaVersion 1 on pre-versioning page roots (silently)', () => {
    const { schema, issues, changed } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [],
    });
    expect((schema as { schemaVersion?: number }).schemaVersion).toBe(1);
    expect(issues).toEqual([]);
    expect(changed).toBe(true);
  });

  it('preserves an existing schemaVersion', () => {
    const { schema } = normalizePageSchema({
      id: 'r',
      type: 'page',
      schemaVersion: 5,
      children: [],
    });
    expect((schema as { schemaVersion?: number }).schemaVersion).toBe(5);
  });

  it('heals a missing children array on containers silently', () => {
    const { schema, issues } = normalizePageSchema({ id: 'r', type: 'page' });
    expect((schema as { children: unknown }).children).toEqual([]);
    expect(issues).toEqual([]);
  });

  it('assigns fresh ids for missing and duplicate ids', () => {
    const { schema, changed } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [
        { id: 'dup', type: 'paragraph', text: 'one' },
        { id: 'dup', type: 'paragraph', text: 'two' },
        { type: 'paragraph', text: 'three' },
      ],
    });
    const children = (schema as { children: { id: string }[] }).children;
    const ids = ['r', ...children.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(children[0].id).toBe('dup');
    expect(changed).toBe(true);
  });

  it('re-ids a child colliding with the generated wrapper root id', () => {
    const { schema } = normalizePageSchema({ id: 'root', type: 'stack', children: [] });
    const child = (schema as { children: { id: string }[] }).children[0];
    expect(schema.id).toBe('root');
    expect(child.id).not.toBe('root');
  });

  it('clamps numeric heading levels silently', () => {
    const { schema, issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [
        { id: 'a', type: 'heading', text: 'x', level: 9 },
        { id: 'b', type: 'heading', text: 'y', level: 0 },
        { id: 'c', type: 'heading', text: 'z', level: 3.6 },
      ],
    });
    const levels = (schema as { children: { level: number }[] }).children.map((c) => c.level);
    expect(levels).toEqual([6, 1, 4]);
    expect(issues).toEqual([]);
  });
});

describe('normalizePageSchema — issues', () => {
  it('rejects a non-object root with a default page fallback', () => {
    const { schema, issues } = normalizePageSchema('nope');
    expect(schema.type).toBe('page');
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('root');
  });

  it('reports unknown element types but keeps the node', () => {
    const { schema, issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [{ id: 'x', type: 'wat', foo: 1 }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('"wat"');
    expect((schema as { children: unknown[] }).children).toHaveLength(1);
  });

  it('reports and drops non-object children', () => {
    const { schema, issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [42, { id: 'p', type: 'paragraph', text: 'ok' }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('page.children[0]');
    expect((schema as { children: { id: string }[] }).children.map((c) => c.id)).toEqual(['p']);
  });

  it('reports and resets a non-array children value', () => {
    const { schema, issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: 'oops',
    });
    expect(issues).toHaveLength(1);
    expect((schema as { children: unknown }).children).toEqual([]);
  });

  it('reports a non-numeric heading level and resets it to 2', () => {
    const { schema, issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [{ id: 'h', type: 'heading', text: 'x', level: '1 onclick=x' }],
    });
    expect(issues).toHaveLength(1);
    expect((schema as { children: { level: number }[] }).children[0].level).toBe(2);
  });

  it('reports children on a non-container type', () => {
    const { issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [{ id: 'd', type: 'divider', children: [] }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('not a container');
  });
});
