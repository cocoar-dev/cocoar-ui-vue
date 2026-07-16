import { describe, it, expect } from 'vitest';
import { usePageBuilder } from './usePageBuilder';
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
