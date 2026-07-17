import { describe, it, expect, vi, afterEach } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { usePageBuilder, type UsePageBuilderReturn } from './usePageBuilder';
import { provideBuilderDnd, type BuilderDndContext } from './useBuilderDnd';
import type { PageNode } from '../schema';

const leaf = (id: string): PageNode => ({ id, type: 'paragraph', props: { text: id } });
const stack = (id: string, children: PageNode[] = []): PageNode => ({ id, type: 'stack', props: {}, children });
const page = (children: PageNode[]): PageNode => ({ id: 'root', type: 'page', children });

function childIds(node: PageNode): string[] {
  return 'children' in node ? node.children.map((c) => c.id) : [];
}

/** provideBuilderDnd needs a component instance for provide(). */
function setup(initial: PageNode) {
  let builder!: UsePageBuilderReturn;
  let dnd!: BuilderDndContext;
  const wrapper = mount(defineComponent({
    setup() {
      builder = usePageBuilder({ initial });
      dnd = provideBuilderDnd(builder);
      return () => null;
    },
  }));
  return { builder, dnd, wrapper };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useBuilderDnd — canDrop', () => {
  it('accepts everything for a palette (new) payload', () => {
    const { dnd } = setup(page([stack('c')]));
    dnd.startDrag({ kind: 'new', type: 'heading' });
    expect(dnd.canDrop([])).toBe(true);
    expect(dnd.canDrop([0])).toBe(true);
  });

  it('rejects drops into the dragged node’s own subtree', () => {
    const { dnd } = setup(page([stack('c', [stack('inner')])]));
    dnd.startDrag({ kind: 'move', path: [0] });
    expect(dnd.canDrop([0])).toBe(false);
    expect(dnd.canDrop([0, 0])).toBe(false);
    expect(dnd.canDrop([])).toBe(true);
  });

  it('rejects everything when no drag is active', () => {
    const { dnd } = setup(page([]));
    expect(dnd.canDrop([])).toBe(false);
  });
});

describe('useBuilderDnd — onZoneDrop', () => {
  it('inserts a new element at the drop index', () => {
    const { builder, dnd } = setup(page([leaf('a')]));
    dnd.startDrag({ kind: 'new', type: 'heading' });
    dnd.onZoneDrop([], 0);
    const ids = childIds(builder.schema.value);
    expect(ids).toHaveLength(2);
    expect(ids[1]).toBe('a');
  });

  it('compensates same-parent down-moves for the pre-removal dropzone index', () => {
    const { builder, dnd } = setup(page([leaf('a'), leaf('b'), leaf('c')]));
    dnd.startDrag({ kind: 'move', path: [0] });
    // Dropzone AFTER 'b' has pre-removal index 2.
    dnd.onZoneDrop([], 2);
    expect(childIds(builder.schema.value)).toEqual(['b', 'a', 'c']);
  });

  it('treats a drop right next to the source position as a no-op', () => {
    const initial = page([leaf('a'), leaf('b')]);
    const { builder, dnd } = setup(initial);
    dnd.startDrag({ kind: 'move', path: [0] });
    // Zones 0 (before a) and 1 (right after a) both mean "stay in place".
    dnd.onZoneDrop([], 1);
    expect(builder.schema.value).toBe(initial);
    expect(builder.canUndo.value).toBe(false);
  });

  it('ignores drops when the target rejects the payload', () => {
    const initial = page([stack('c', [stack('inner')])]);
    const { builder, dnd } = setup(initial);
    dnd.startDrag({ kind: 'move', path: [0] });
    dnd.onZoneDrop([0, 0], 0);
    expect(builder.schema.value).toBe(initial);
  });
});

describe('useBuilderDnd — zone enter/leave', () => {
  it('tracks the active zone and refuses unacceptable ones', () => {
    const { dnd } = setup(page([stack('c', [stack('inner')])]));
    dnd.startDrag({ kind: 'move', path: [0] });
    expect(dnd.onZoneEnter('z1', [])).toBe(true);
    expect(dnd.activeZoneKey.value).toBe('z1');
    expect(dnd.onZoneEnter('z2', [0])).toBe(false);
    expect(dnd.activeZoneKey.value).toBe('z1');
  });

  it('clears the active zone only after the leave delay (flicker guard)', () => {
    vi.useFakeTimers();
    const { dnd } = setup(page([]));
    dnd.startDrag({ kind: 'new', type: 'heading' });
    dnd.onZoneEnter('z1', []);
    dnd.onZoneLeave('z1');
    expect(dnd.activeZoneKey.value).toBe('z1');
    vi.advanceTimersByTime(120);
    expect(dnd.activeZoneKey.value).toBeNull();
  });

  it('re-entering during the leave delay keeps the zone active', () => {
    vi.useFakeTimers();
    const { dnd } = setup(page([]));
    dnd.startDrag({ kind: 'new', type: 'heading' });
    dnd.onZoneEnter('z1', []);
    dnd.onZoneLeave('z1');
    dnd.onZoneEnter('z1', []);
    vi.advanceTimersByTime(120);
    expect(dnd.activeZoneKey.value).toBe('z1');
  });

  it('endDrag resets payload and zone state', () => {
    const { dnd } = setup(page([]));
    dnd.startDrag({ kind: 'new', type: 'heading' });
    dnd.onZoneEnter('z1', []);
    dnd.endDrag();
    expect(dnd.isDragging.value).toBe(false);
    expect(dnd.payload.value).toBeNull();
    expect(dnd.activeZoneKey.value).toBeNull();
  });
});
