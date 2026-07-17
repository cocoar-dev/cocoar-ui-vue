import { describe, it, expect } from 'vitest';
import { computed } from 'vue';
import { usePageBuilder } from './usePageBuilder';
import { BUILTIN_ELEMENTS } from '../elements/builtins';
import type { PageNode } from '../schema';

const leaf = (id: string): PageNode => ({ id, type: 'paragraph', props: { text: id } });
const stack = (id: string, children: PageNode[] = []): PageNode => ({ id, type: 'stack', props: {}, children });
const page = (children: PageNode[]): PageNode => ({ id: 'root', type: 'page', children });

function allIds(n: PageNode): string[] {
  const children = 'children' in n && Array.isArray(n.children) ? n.children : [];
  return [n.id, ...children.flatMap(allIds)];
}

describe('usePageBuilder.moveTo', () => {
  it('keeps the node when dropped into a later sibling container, and selection follows it', () => {
    const builder = usePageBuilder({ initial: page([leaf('a'), stack('c1'), stack('c2')]) });
    builder.moveTo([0], [2], 0);

    expect(allIds(builder.schema.value).sort()).toEqual(['a', 'c1', 'c2', 'root']);
    // After removal, c2 sits at index 1 — both the node and the selection must land there.
    expect(builder.selectedPath.value).toEqual([1, 0]);
    expect(builder.selectedNode.value?.id).toBe('a');
  });

  it('leaves schema, selection and history untouched when the move is rejected', () => {
    const initial = page([stack('c', [stack('inner')])]);
    const builder = usePageBuilder({ initial });
    builder.select([0]);
    builder.moveTo([0], [0, 0], 0);

    expect(builder.schema.value).toBe(initial);
    expect(builder.selectedPath.value).toEqual([0]);
    expect(builder.canUndo.value).toBe(false);
  });

  it('undo restores the pre-move tree', () => {
    const initial = page([leaf('a'), stack('c')]);
    const builder = usePageBuilder({ initial });
    builder.moveTo([0], [1], 0);
    expect(builder.schema.value).not.toBe(initial);

    builder.undo();
    expect(builder.schema.value).toBe(initial);
    expect(builder.canRedo.value).toBe(true);
  });
});

describe('usePageBuilder.duplicate', () => {
  it('inserts the copy right after the source and selects it', () => {
    const builder = usePageBuilder({
      initial: page([stack('c', [leaf('x')]), leaf('b')]),
    });
    builder.duplicate([0]);

    const children = (builder.schema.value as { children: PageNode[] }).children;
    expect(children).toHaveLength(3);
    expect(children[1].type).toBe('stack');
    expect(children[1].id).not.toBe('c');
    expect((children[1] as { children: PageNode[] }).children[0].id).not.toBe('x');
    expect(builder.selectedPath.value).toEqual([1]);
    expect(builder.selectedNode.value).toBe(children[1]);
  });

  it('undo removes the copy again', () => {
    const initial = page([leaf('a')]);
    const builder = usePageBuilder({ initial });
    builder.duplicate([0]);
    expect(allIds(builder.schema.value)).toHaveLength(3);
    builder.undo();
    expect(builder.schema.value).toBe(initial);
  });

  it('ignores the root', () => {
    const initial = page([]);
    const builder = usePageBuilder({ initial });
    builder.duplicate([]);
    expect(builder.schema.value).toBe(initial);
  });
});

describe('usePageBuilder.addChild', () => {
  function added(type: string) {
    const builder = usePageBuilder({ initial: page([]) });
    builder.addChild([], type);
    return (builder.schema.value as { children: PageNode[] }).children[0] as
      PageNode & { props?: Record<string, unknown>; name?: string; children?: PageNode[] };
  }

  it('builds the props bag from the registry defaults', () => {
    expect(added('heading').props).toEqual({ text: 'Heading', level: 2 });
    expect((added('select').props as { options: unknown[] }).options).toHaveLength(2);
    expect(added('section').props).toEqual({ title: 'Section' });
  });

  it('mints a field name only for value elements', () => {
    expect(added('select').name).toMatch(/^field_/);
    expect(added('text-input').name).toMatch(/^field_/);
    expect(added('heading').name).toBeUndefined();
    expect(added('section').name).toBeUndefined();
  });

  it('gives only containers a children array', () => {
    expect(added('section').children).toEqual([]);
    expect(added('stack').children).toEqual([]);
    expect(added('heading').children).toBeUndefined();
    expect(added('select').children).toBeUndefined();
  });

  it('creates consumer-registered custom elements from the merged registry', () => {
    const DummyComponent = { render: () => null };
    const builder = usePageBuilder({
      initial: page([]),
      elements: computed(() => ({
        ...BUILTIN_ELEMENTS,
        'acme-rating': {
          renderer: DummyComponent,
          value: {},
          builder: {
            label: { key: 'x', fallback: 'Rating' },
            defaults: () => ({ max: 5 }),
          },
        },
      })),
    });
    builder.addChild([], 'acme-rating');

    const node = (builder.schema.value as { children: PageNode[] }).children[0] as
      PageNode & { props: Record<string, unknown>; name?: string };
    expect(node.type).toBe('acme-rating');
    expect(node.props).toEqual({ max: 5 });
    expect(node.name).toMatch(/^field_/);
  });

  it('is a no-op for unregistered types', () => {
    const initial = page([]);
    const builder = usePageBuilder({ initial });
    builder.addChild([], 'not-registered');

    expect(builder.schema.value).toBe(initial);
    expect(builder.canUndo.value).toBe(false);
  });
});

describe('usePageBuilder history', () => {
  it('addChild → undo → redo round-trips the tree', () => {
    const builder = usePageBuilder({ initial: page([]) });
    builder.addChild([], 'heading');
    const withChild = builder.schema.value;
    expect(allIds(withChild)).toHaveLength(2);

    builder.undo();
    expect(allIds(builder.schema.value)).toHaveLength(1);

    builder.redo();
    expect(builder.schema.value).toBe(withChild);
  });

  it('remove keeps a sensible selection and undo restores the node', () => {
    const builder = usePageBuilder({ initial: page([leaf('a'), leaf('b')]) });
    builder.remove([0]);
    expect(allIds(builder.schema.value)).toEqual(['root', 'b']);

    builder.undo();
    expect(allIds(builder.schema.value)).toEqual(['root', 'a', 'b']);
  });
});

describe('usePageBuilder.addChild — field binding (field-first flow)', () => {
  it('applies name, contract label, and required to the fresh node', () => {
    const builder = usePageBuilder({ initial: page([]) });
    builder.addChild([], 'password-input', undefined, {
      name: 'password', label: 'Passwort', required: true,
    });
    const node = (builder.schema.value as { children: PageNode[] }).children[0] as
      PageNode & { props: Record<string, unknown>; name?: string; validation?: { required?: boolean } };
    expect(node.type).toBe('password-input');
    expect(node.name).toBe('password');
    expect(node.props.label).toBe('Passwort');
    expect(node.validation).toEqual({ required: true });
  });

  it('skips the label carry-over when the element has no label prop', () => {
    const builder = usePageBuilder({ initial: page([]) });
    builder.addChild([], 'checkbox', undefined, { name: 'ok' });
    const node = (builder.schema.value as { children: PageNode[] }).children[0] as
      PageNode & { props: Record<string, unknown>; name?: string; validation?: unknown };
    expect(node.name).toBe('ok');
    expect(node.props.label).toBe('Checkbox'); // element default kept — no bind label given
    expect(node.validation).toBeUndefined();
  });
});

describe('usePageBuilder.convertTo — representation switch', () => {
  function withPasswordField() {
    const builder = usePageBuilder({ initial: page([]) });
    builder.addChild([], 'text-input', undefined, { name: 'password', label: 'Passwort', required: true });
    return builder;
  }

  it('keeps id/name/validation/style/label, resets the rest of the bag', () => {
    const builder = withPasswordField();
    const beforeNode = (builder.schema.value as { children: PageNode[] }).children[0] as
      PageNode & { id: string; props: Record<string, unknown> };
    builder.patch([0], { props: { placeholder: 'secret…' } });
    builder.patch([0], { style: { width: '200px' } });
    builder.patch([0], { defaultValue: 'x' });

    builder.convertTo([0], 'password-input');

    const node = (builder.schema.value as { children: PageNode[] }).children[0] as
      PageNode & { id: string; props: Record<string, unknown>; name?: string;
        validation?: unknown; style?: unknown; defaultValue?: unknown };
    expect(node.type).toBe('password-input');
    expect(node.id).toBe(beforeNode.id);
    expect(node.name).toBe('password');
    expect(node.validation).toEqual({ required: true });
    expect(node.style).toEqual({ width: '200px' });
    expect(node.defaultValue).toBe('x');
    expect(node.props.label).toBe('Passwort');
    expect('placeholder' in node.props).toBe(false); // element-specific — restarts from defaults
  });

  it('round-trips through undo and is a no-op for same/unknown targets', () => {
    const builder = withPasswordField();
    const before = builder.schema.value;
    builder.convertTo([0], 'text-input'); // same type
    builder.convertTo([0], 'not-registered');
    expect(builder.schema.value).toBe(before);

    builder.convertTo([0], 'password-input');
    expect((builder.schema.value as { children: PageNode[] }).children[0].type).toBe('password-input');
    builder.undo();
    expect(builder.schema.value).toBe(before);
  });
});

describe('usePageBuilder.addChild — strict-contract minting rule', () => {
  it('leaves fresh value elements unbound under a strict contract', () => {
    const builder = usePageBuilder({
      initial: page([]),
      config: computed(() => ({ fields: [{ name: 'username', valueType: 'string' as const }] })),
    });
    builder.addChild([], 'text-input');
    const node = (builder.schema.value as { children: PageNode[] }).children[0] as
      PageNode & { name?: string };
    expect(node.name).toBeUndefined();
  });

  it('keeps minting when allowCustomFields is on', () => {
    const builder = usePageBuilder({
      initial: page([]),
      config: computed(() => ({
        fields: [{ name: 'username', valueType: 'string' as const }],
        allowCustomFields: true,
      })),
    });
    builder.addChild([], 'text-input');
    const node = (builder.schema.value as { children: PageNode[] }).children[0] as
      PageNode & { name?: string };
    expect(node.name).toMatch(/^field_/);
  });
});

describe('usePageBuilder.convertTo — children guard', () => {
  it('refuses converting a container with children to a leaf', () => {
    const builder = usePageBuilder({ initial: page([]) });
    builder.addChild([], 'stack');
    builder.addChild([0], 'heading');
    const before = builder.schema.value;

    // stack has no value spec, so the UI never offers this — but the operation
    // itself must hold the line for programmatic callers too.
    builder.convertTo([0], 'heading');
    expect(builder.schema.value).toBe(before);

    builder.convertTo([0], 'card'); // container → container keeps the children
    const converted = (builder.schema.value as { children: PageNode[] }).children[0] as
      PageNode & { children: PageNode[] };
    expect(converted.type).toBe('card');
    expect(converted.children).toHaveLength(1);
  });
});
