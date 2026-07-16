import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  getNodeAt,
  insertChild,
  moveNode,
  moveSibling,
  patchNode,
  rebaseAfterRemoval,
  type PageNode,
} from './operations';

const leaf = (id: string): PageNode => ({ id, type: 'paragraph', props: { text: id } });
const stack = (id: string, children: PageNode[] = []): PageNode => ({ id, type: 'stack', props: {}, children });
const page = (children: PageNode[]): PageNode => ({ id: 'root', type: 'page', children });

function allIds(n: PageNode): string[] {
  const children = 'children' in n && Array.isArray(n.children) ? n.children : [];
  return [n.id, ...children.flatMap(allIds)];
}

function childIds(root: PageNode, path: number[]): string[] {
  const loc = getNodeAt(root, path);
  if (!loc || !('children' in loc.node)) return [];
  return loc.node.children.map((c) => c.id);
}

let warnSpy: MockInstance;
beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
});

describe('moveNode — cross-container moves (data-loss regression)', () => {
  it('moves a node into the directly following sibling container', () => {
    const root = page([leaf('a'), stack('c')]);
    const next = moveNode(root, [0], [1], 0);
    expect(allIds(next).sort()).toEqual(allIds(root).sort());
    expect(childIds(next, [0])).toEqual(['a']);
  });

  it('moves a node into a later sibling container without losing it', () => {
    const root = page([leaf('a'), stack('c1'), stack('c2')]);
    const next = moveNode(root, [0], [2], 0);
    expect(allIds(next).sort()).toEqual(allIds(root).sort());
    expect(childIds(next, [1])).toEqual(['a']);
    expect(childIds(next, [0])).toEqual([]);
  });

  it('does not land in the WRONG container when one sits between', () => {
    const root = page([leaf('a'), stack('c1'), stack('c2')]);
    const next = moveNode(root, [0], [1], 0);
    expect(childIds(next, [0])).toEqual(['a']);
    expect(childIds(next, [1])).toEqual([]);
  });

  it('moves into a container nested inside a later sibling', () => {
    const root = page([leaf('a'), stack('c1', [stack('c1a')])]);
    const next = moveNode(root, [0], [1, 0], 0);
    expect(allIds(next).sort()).toEqual(allIds(root).sort());
    expect(childIds(next, [0, 0])).toEqual(['a']);
  });

  it('moves into an EARLIER sibling container unchanged by the removal', () => {
    const root = page([stack('c1'), stack('c2', [leaf('x')])]);
    const next = moveNode(root, [1, 0], [0], 0);
    expect(childIds(next, [0])).toEqual(['x']);
    expect(childIds(next, [1])).toEqual([]);
  });

  it('keeps same-parent post-removal index semantics (moveSibling contract)', () => {
    const root = page([leaf('a'), leaf('b'), leaf('c')]);
    const next = moveNode(root, [0], [], 2);
    expect(childIds(next, [])).toEqual(['b', 'c', 'a']);
  });

  it('rejects a move into the node’s own subtree', () => {
    const root = page([stack('c', [stack('inner')])]);
    expect(moveNode(root, [0], [0, 0], 0)).toBe(root);
  });

  it('rejects moving the root', () => {
    const root = page([leaf('a')]);
    expect(moveNode(root, [], [0], 0)).toBe(root);
  });

  it('returns the ORIGINAL tree when the target does not resolve (no half-applied removal)', () => {
    const root = page([leaf('a')]);
    const next = moveNode(root, [0], [5], 0);
    expect(next).toBe(root);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('returns the ORIGINAL tree when the target is not a container', () => {
    const root = page([leaf('a'), leaf('b')]);
    const next = moveNode(root, [0], [1], 0);
    expect(next).toBe(root);
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

describe('moveSibling', () => {
  it('moves a node down among its siblings', () => {
    const root = page([leaf('a'), leaf('b'), leaf('c')]);
    expect(childIds(moveSibling(root, [0], 1), [])).toEqual(['b', 'a', 'c']);
  });

  it('moves a node up among its siblings', () => {
    const root = page([leaf('a'), leaf('b'), leaf('c')]);
    expect(childIds(moveSibling(root, [2], -1), [])).toEqual(['a', 'c', 'b']);
  });

  it('is a no-op at the edges', () => {
    const root = page([leaf('a'), leaf('b')]);
    expect(moveSibling(root, [0], -1)).toBe(root);
    expect(moveSibling(root, [1], 1)).toBe(root);
  });
});

describe('rebaseAfterRemoval', () => {
  it('decrements the segment that crosses the removed node', () => {
    expect(rebaseAfterRemoval([0], [2])).toEqual([1]);
    expect(rebaseAfterRemoval([1, 0], [1, 2])).toEqual([1, 1]);
    expect(rebaseAfterRemoval([1, 0], [1, 2, 0])).toEqual([1, 1, 0]);
  });

  it('leaves paths before the removal point untouched', () => {
    expect(rebaseAfterRemoval([2], [1])).toEqual([1]);
    expect(rebaseAfterRemoval([1, 2], [1, 0])).toEqual([1, 0]);
  });

  it('leaves unrelated branches and ancestors untouched', () => {
    expect(rebaseAfterRemoval([0, 1], [2, 0])).toEqual([2, 0]);
    expect(rebaseAfterRemoval([1, 0], [1])).toEqual([1]);
    expect(rebaseAfterRemoval([1], [])).toEqual([]);
  });
});

describe('insertChild', () => {
  it('warns and returns the tree unchanged for an unresolvable parent path', () => {
    const root = page([leaf('a')]);
    expect(insertChild(root, [5], 0, leaf('b'))).toBe(root);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('warns and returns the tree unchanged when the parent is not a container', () => {
    const root = page([leaf('a')]);
    expect(insertChild(root, [0], 0, leaf('b'))).toBe(root);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('clamps an out-of-range index into the valid range', () => {
    const root = page([leaf('a')]);
    const next = insertChild(root, [], 99, leaf('b'));
    expect(childIds(next, [])).toEqual(['a', 'b']);
  });
});

describe('patchNode — contract the props editors rely on', () => {
  it('replaces object values wholesale', () => {
    const root = page([
      { id: 't', type: 'text-input', props: {}, validation: { required: true, minLength: 8 } },
    ]);
    const next = patchNode(root, [0], { validation: { minLength: 8 } } as never);
    const node = getNodeAt(next, [0])!.node as { validation?: unknown };
    expect(node.validation).toEqual({ minLength: 8 });
  });

  it('clears a key when the patch value is undefined', () => {
    const root = page([
      { id: 't', type: 'text-input', props: {}, validation: { required: true } },
    ]);
    const next = patchNode(root, [0], { validation: undefined } as never);
    const node = getNodeAt(next, [0])!.node;
    expect('validation' in node).toBe(false);
  });

  it('merges a props patch one level deep into the bag (set + overwrite)', () => {
    const root = page([
      { id: 'h', type: 'heading', props: { text: 'Old', level: 2 } },
    ]);
    const next = patchNode(root, [0], { props: { text: 'New', level: 3 } } as never);
    const node = getNodeAt(next, [0])!.node as { props: Record<string, unknown> };
    expect(node.props).toEqual({ text: 'New', level: 3 });
  });

  it('keeps untouched bag keys when patching a single prop', () => {
    const root = page([
      { id: 'h', type: 'heading', props: { text: 'Hi', level: 4 } },
    ]);
    const next = patchNode(root, [0], { props: { text: 'Hello' } } as never);
    const node = getNodeAt(next, [0])!.node as { props: Record<string, unknown> };
    expect(node.props).toEqual({ text: 'Hello', level: 4 });
  });

  it('deletes a bag key when the patch value is empty ("" / null / undefined)', () => {
    const root = page([
      { id: 'h', type: 'heading', props: { text: 'Hi', level: 4 } },
    ]);
    for (const empty of ['', null, undefined]) {
      const next = patchNode(root, [0], { props: { level: empty } } as never);
      const node = getNodeAt(next, [0])!.node as { props: Record<string, unknown> };
      expect('level' in node.props).toBe(false);
      expect(node.props.text).toBe('Hi');
    }
  });

  it('returns the SAME root when a props patch changes nothing (identity)', () => {
    const root = page([
      { id: 'h', type: 'heading', props: { text: 'Hi' } },
    ]);
    expect(patchNode(root, [0], { props: { text: 'Hi' } } as never)).toBe(root);
    expect(patchNode(root, [0], { props: { level: undefined } } as never)).toBe(root);
    expect(patchNode(root, [0], { props: {} } as never)).toBe(root);
  });
});
