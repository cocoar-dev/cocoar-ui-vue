import { describe, it, expect } from 'vitest';
import { migrateLegacyTypes, normalizePageSchema } from './schemaNormalize';
import { migrateV1PropsBag } from './schemaMigrateV1';
import type { PageNode } from '../schema';

const validPage: PageNode = {
  id: 'root',
  type: 'page',
  schemaVersion: 2,
  children: [
    { id: 'h', type: 'heading', props: { text: 'Hello', level: 2 } },
    { id: 's', type: 'stack', props: {}, children: [{ id: 'p', type: 'paragraph', props: { text: 'Hi' } }] },
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

describe('migrateV1PropsBag', () => {
  it('moves flat v1 element fields into the props bag, keeping host fields at node level', () => {
    const migrated = migrateV1PropsBag({
      id: 't',
      type: 'text-input',
      label: 'Email',
      placeholder: 'you@example.com',
      name: 'email',
      defaultValue: 'x@y.z',
      validation: { required: true },
      style: { width: '200px' },
    }) as Record<string, unknown>;
    expect(migrated.props).toEqual({ label: 'Email', placeholder: 'you@example.com' });
    expect(migrated.name).toBe('email');
    expect(migrated.defaultValue).toBe('x@y.z');
    expect(migrated.validation).toEqual({ required: true });
    expect(migrated.style).toEqual({ width: '200px' });
    expect('label' in migrated).toBe(false);
  });

  it('migrates deep v1 trees recursively', () => {
    const migrated = migrateV1PropsBag({
      id: 'r',
      type: 'page',
      children: [
        { id: 's', type: 'stack', direction: 'row', children: [{ id: 'h', type: 'heading', text: 'Hi', level: 3 }] },
      ],
    }) as { children: { props: unknown; children: { props: unknown }[] }[] };
    expect(migrated.children[0].props).toEqual({ direction: 'row' });
    expect(migrated.children[0].children[0].props).toEqual({ text: 'Hi', level: 3 });
  });

  it('chains after migrateLegacyTypes — column/row become stacks with a direction in the bag', () => {
    const migrated = migrateV1PropsBag(migrateLegacyTypes({
      id: 'c',
      type: 'column',
      children: [{ id: 'x', type: 'row', children: [] }],
    })) as { type: string; props: unknown; children: { type: string; props: unknown }[] };
    expect(migrated.type).toBe('stack');
    expect(migrated.props).toEqual({ direction: 'column' });
    expect(migrated.children[0].type).toBe('stack');
    expect(migrated.children[0].props).toEqual({ direction: 'row' });
  });

  it('is identity on an already-v2 tree (idempotent)', () => {
    expect(migrateV1PropsBag(validPage)).toBe(validPage);
    expect(migrateV1PropsBag(migrateV1PropsBag(validPage))).toBe(validPage);
  });

  it('leaves the page root untouched — it never gains a props bag', () => {
    const migrated = migrateV1PropsBag({
      id: 'r',
      type: 'page',
      children: [{ id: 'h', type: 'heading', text: 'Hi' }],
    }) as Record<string, unknown>;
    expect('props' in migrated).toBe(false);
    expect((migrated.children as { props: unknown }[])[0].props).toEqual({ text: 'Hi' });
  });

  it('leaves unknown types untouched (host-vs-props split unknowable)', () => {
    const unknown = { id: 'x', type: 'acme-rating', max: 5 };
    expect(migrateV1PropsBag(unknown)).toBe(unknown);
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
      props: {},
      children: [],
    });
    expect(schema.type).toBe('page');
    expect((schema as { schemaVersion?: number }).schemaVersion).toBe(2);
    expect((schema as { children: PageNode[] }).children[0].type).toBe('card');
    expect(issues).toEqual([]);
    expect(changed).toBe(true);
  });

  it('stamps schemaVersion 2 on pre-versioning page roots (silently)', () => {
    const { schema, issues, changed } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [],
    });
    expect((schema as { schemaVersion?: number }).schemaVersion).toBe(2);
    expect(issues).toEqual([]);
    expect(changed).toBe(true);
  });

  it('re-stamps v1 documents as schemaVersion 2 after the bag migration', () => {
    const { schema, changed } = normalizePageSchema({
      id: 'r',
      type: 'page',
      schemaVersion: 1,
      children: [{ id: 'h', type: 'heading', text: 'Hi', level: 2 }],
    });
    expect((schema as { schemaVersion?: number }).schemaVersion).toBe(2);
    const child = (schema as { children: { props: unknown }[] }).children[0];
    expect(child.props).toEqual({ text: 'Hi', level: 2 });
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

  it('heals a missing props bag on known elements silently', () => {
    const { schema, issues, changed } = normalizePageSchema({
      id: 'r',
      type: 'page',
      schemaVersion: 2,
      children: [{ id: 'd', type: 'divider' }],
    });
    expect((schema as { children: { props: unknown }[] }).children[0].props).toEqual({});
    expect(issues).toEqual([]);
    expect(changed).toBe(true);
  });

  it('resets a non-object props value to an empty bag without dropping the node', () => {
    const { schema, issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      schemaVersion: 2,
      children: [{ id: 'd', type: 'divider', props: 'nope' }],
    });
    expect((schema as { children: { props: unknown }[] }).children[0].props).toEqual({});
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('assigns fresh ids for missing and duplicate ids', () => {
    const { schema, changed } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [
        { id: 'dup', type: 'paragraph', props: { text: 'one' } },
        { id: 'dup', type: 'paragraph', props: { text: 'two' } },
        { type: 'paragraph', props: { text: 'three' } },
      ],
    });
    const children = (schema as { children: { id: string }[] }).children;
    const ids = ['r', ...children.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(children[0].id).toBe('dup');
    expect(changed).toBe(true);
  });

  it('re-ids a child colliding with the generated wrapper root id', () => {
    const { schema } = normalizePageSchema({ id: 'root', type: 'stack', props: {}, children: [] });
    const child = (schema as { children: { id: string }[] }).children[0];
    expect(schema.id).toBe('root');
    expect(child.id).not.toBe('root');
  });

  it('clamps numeric heading levels silently', () => {
    const { schema, issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      schemaVersion: 2,
      children: [
        { id: 'a', type: 'heading', props: { text: 'x', level: 9 } },
        { id: 'b', type: 'heading', props: { text: 'y', level: 0 } },
        { id: 'c', type: 'heading', props: { text: 'z', level: 3.6 } },
      ],
    });
    const levels = (schema as { children: { props: { level: number } }[] }).children
      .map((c) => c.props.level);
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
      children: [42, { id: 'p', type: 'paragraph', props: { text: 'ok' } }],
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
      schemaVersion: 2,
      children: [{ id: 'h', type: 'heading', props: { text: 'x', level: '1 onclick=x' } }],
    });
    expect(issues).toHaveLength(1);
    expect((schema as { children: { props: { level: number } }[] }).children[0].props.level).toBe(2);
  });

  it('reports children on a non-container type', () => {
    const { issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [{ id: 'd', type: 'divider', props: {}, children: [] }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('not a container');
  });
});

describe('normalizePageSchema — issue severity', () => {
  it('classifies dropped input as error, healed/lossless findings as warning', () => {
    const { issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      schemaVersion: 2,
      children: [
        42, // dropped → error
        { id: 'x', type: 'wat' }, // unknown type, kept → warning
        { id: 'h', type: 'heading', props: { text: 'x', level: 'nope' } }, // healed → warning
        { id: 'd', type: 'divider', props: {}, children: [] }, // ignored children → warning
      ],
    });
    const bySeverity = (s: string) => issues.filter((i) => i.severity === s);
    expect(bySeverity('error')).toHaveLength(1);
    expect(bySeverity('error')[0].path).toBe('page.children[0]');
    expect(bySeverity('warning')).toHaveLength(3);
  });

  it('classifies a non-object root as error', () => {
    const { issues } = normalizePageSchema('nope');
    expect(issues[0].severity).toBe('error');
  });
});

describe('normalizePageSchema — unknown-typed subtrees', () => {
  it('recurses into children of unknown-typed nodes (id dedup reaches them)', () => {
    const { schema, issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [
        { id: 'dup', type: 'paragraph', props: { text: 'visible' } },
        {
          id: 'x',
          type: 'acme-rating-group',
          props: { max: 5 },
          children: [{ id: 'dup', type: 'paragraph', props: { text: 'inside unknown' } }],
        },
      ],
    });
    const children = (schema as { children: { id: string; children?: { id: string }[] }[] })
      .children;
    const innerId = children[1].children![0].id;
    expect(innerId).not.toBe('dup');
    // The unknown node itself is a lossless warning, not an error.
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('keeps an unknown node byte-identical apart from structural healing', () => {
    const unknown = {
      id: 'x',
      type: 'acme-rating',
      props: { max: 5, exotic: { nested: true } },
      customFlag: 'kept',
    };
    const { schema } = normalizePageSchema({ id: 'r', type: 'page', children: [unknown] });
    const kept = (schema as { children: Record<string, unknown>[] }).children[0];
    expect(kept).toBe(unknown); // untouched → same reference
  });

  it('leaves a non-array children value on an unknown node alone (lossless)', () => {
    const unknown = { id: 'x', type: 'acme-thing', children: 'opaque' };
    const { schema, issues } = normalizePageSchema({
      id: 'r',
      type: 'page',
      children: [unknown],
    });
    const kept = (schema as { children: Record<string, unknown>[] }).children[0];
    expect(kept.children).toBe('opaque');
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});

describe('normalizePageSchema — registry-aware (options.elements)', () => {
  const DummyRenderer = { template: '<div />' };

  it('treats registered consumer types as known (no unknown-type warning)', () => {
    const { issues } = normalizePageSchema(
      { id: 'r', type: 'page', schemaVersion: 2, children: [{ id: 'x', type: 'acme-rating', props: { max: 5 } }] },
      { elements: { 'acme-rating': { renderer: DummyRenderer } } },
    );
    expect(issues).toEqual([]);
  });

  it('runs the definition normalizeProps as a healing pass over the bag', () => {
    const { schema, changed } = normalizePageSchema(
      {
        id: 'r', type: 'page', schemaVersion: 2,
        children: [{ id: 'x', type: 'acme-rating', props: { max: 99 } }],
      },
      {
        elements: {
          'acme-rating': {
            renderer: DummyRenderer,
            normalizeProps: (raw) => {
              const bag = raw as { max?: number };
              const max = Math.min(10, Math.max(1, Number(bag.max ?? 5)));
              return max === bag.max ? (raw as { max: number }) : { ...bag, max };
            },
          },
        },
      },
    );
    const child = (schema as { children: { props: { max: number } }[] }).children[0];
    expect(child.props.max).toBe(10);
    expect(changed).toBe(true);
  });

  it('guards a throwing normalizeProps (bag left as-is, no crash)', () => {
    const { schema, issues } = normalizePageSchema(
      { id: 'r', type: 'page', schemaVersion: 2, children: [{ id: 'x', type: 'acme-rating', props: { max: 3 } }] },
      { elements: { 'acme-rating': { renderer: DummyRenderer, normalizeProps: () => { throw new Error('boom'); } } } },
    );
    const child = (schema as { children: { props: { max: number } }[] }).children[0];
    expect(child.props.max).toBe(3);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('recurses into children of registered custom CONTAINERS without a not-a-container warning', () => {
    const { schema, issues } = normalizePageSchema(
      {
        id: 'r', type: 'page', schemaVersion: 2,
        children: [{
          id: 'x', type: 'acme-panel', props: {},
          children: [{ id: 'dup', type: 'paragraph', props: { text: 'a' } }, { id: 'dup', type: 'paragraph', props: { text: 'b' } }],
        }],
      },
      { elements: { 'acme-panel': { renderer: DummyRenderer, container: true } } },
    );
    expect(issues).toEqual([]);
    const kids = (schema as { children: { children: { id: string }[] }[] }).children[0].children;
    expect(kids[0].id).not.toBe(kids[1].id);
  });
});
