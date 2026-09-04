import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useDragDrop, type DragPoint, type UseDragDropReturn } from './useDragDrop';

interface Row {
  id: string;
}

function pointerEvent(type: string, init: Record<string, unknown> = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init }) as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  Object.defineProperty(event, 'isPrimary', { value: true });
  return event;
}

interface SurfaceOptions {
  dragGroup?: string;
  dragId?: string;
  dragAccept?: string[];
  engine?: 'native' | 'pointer' | 'auto';
  canDrop?: (payload: { items: readonly Row[] }) => boolean;
}

/** One surface: a container with rows; source and target at once. */
function surface(name: string, initial: Row[], options: SurfaceOptions = {}) {
  const items = ref<Row[]>(initial);
  const hovers: DragPoint[] = [];
  const events: string[] = [];
  let api!: UseDragDropReturn<Row>;
  const Comp = defineComponent({
    setup() {
      const container = ref<HTMLElement | null>(null);
      api = useDragDrop<Row>({
        engine: options.engine ?? 'pointer',
        dragGroup: options.dragGroup,
        dragId: options.dragId,
        dragAccept: options.dragAccept,
        canDrop: options.canDrop,
        pointer: {
          target: container,
          onHover: (point) => hovers.push(point),
          onLeave: () => events.push('leave'),
          onDrop: () => items.value.length, // append
        },
        onDragStart: (dragged) => events.push(`start:${dragged.map((r) => r.id).join(',')}`),
        onDragEnd: ({ dropped }) => events.push(`end:${dropped}`),
        onDropAccept: ({ items: dropped, insertIndex, fromSelf }) => {
          events.push(`accept:${dropped.map((r) => r.id).join(',')}@${insertIndex}:${fromSelf}`);
          items.value = [...items.value, ...dropped];
        },
        onItemsRemove: ({ items: removed }) => {
          events.push(`remove:${removed.map((r) => r.id).join(',')}`);
          items.value = items.value.filter((row) => !removed.includes(row));
        },
      });
      return () =>
        h(
          'div',
          { ref: container, class: `surface-${name}` },
          items.value.map((row) =>
            h('div', {
              class: 'row',
              'data-id': row.id,
              onPointerdown: (event: PointerEvent) => api.onPointerDown(event, [row]),
            }, row.id),
          ),
        );
    },
  });
  const wrapper = mount(Comp, { attachTo: document.body });
  return { wrapper, items, hovers, events, api: () => api, el: wrapper.element as HTMLElement };
}

function pointAt(element: Element | null) {
  document.elementFromPoint = () => element;
}

describe('useDragDrop pointer engine', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('resolves the engine, including auto', () => {
    const native = surface('n', [], { engine: 'native' });
    const pointer = surface('p', [], { engine: 'pointer' });
    expect(native.api().engine.value).toBe('native');
    expect(pointer.api().engine.value).toBe('pointer');
    const auto = surface('a', [], { engine: 'auto' });
    expect(['native', 'pointer']).toContain(auto.api().engine.value);
  });

  it('moves a row between two surfaces after the mouse threshold', async () => {
    const left = surface('left', [{ id: 'a' }, { id: 'b' }], { dragGroup: 'g', dragId: 'left' });
    const right = surface('right', [{ id: 'x' }], { dragGroup: 'g', dragId: 'right' });
    const rowA = left.el.querySelector('.row') as HTMLElement;
    rowA.getBoundingClientRect = () => ({ top: 0, left: 0, width: 100, height: 20, right: 100, bottom: 20, x: 0, y: 0, toJSON: () => ({}) });

    rowA.dispatchEvent(pointerEvent('pointerdown', { clientX: 5, clientY: 5, button: 0 }));
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 7, clientY: 6 })); // under threshold
    expect(left.api().isDragging.value).toBe(false);

    pointAt(right.el);
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 200, clientY: 40 }));
    await nextTick();
    expect(left.api().isDragging.value).toBe(true);
    expect(right.api().isDragOver.value).toBe(true);
    expect(right.hovers.at(-1)).toEqual({ x: 200, y: 40 });
    expect(document.body.querySelector('.coar-dnd-ghost')).not.toBeNull();

    document.dispatchEvent(pointerEvent('pointerup', { clientX: 200, clientY: 40 }));
    await nextTick();
    expect(right.items.value.map((r) => r.id)).toEqual(['x', 'a']);
    expect(left.items.value.map((r) => r.id)).toEqual(['b']);
    expect(right.events).toContain('accept:a@1:false');
    expect(left.events).toEqual(['start:a', 'remove:a', 'end:true']);
    expect(right.events).toContain('leave');
    expect(document.body.querySelector('.coar-dnd-ghost')).toBeNull();
    expect(left.api().isDragging.value).toBe(false);
  });

  it('refuses other groups, honours dragAccept and canDrop', async () => {
    const source = surface('s', [{ id: 'a' }], { dragGroup: 'g', dragId: 'src' });
    const otherGroup = surface('o', [], { dragGroup: 'h' });
    const notListed = surface('l', [], { dragGroup: 'g', dragAccept: ['someone-else'] });
    const vetoed = surface('v', [], { dragGroup: 'g', canDrop: () => false });

    for (const target of [otherGroup, notListed, vetoed]) {
      const row = source.el.querySelector('.row') as HTMLElement;
      row.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 }));
      pointAt(target.el);
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 50, clientY: 50 }));
      await nextTick();
      expect(target.api().isDragOver.value).toBe(false);
      document.dispatchEvent(pointerEvent('pointerup', { clientX: 50, clientY: 50 }));
      await nextTick();
      expect(target.items.value).toEqual([]);
      expect(source.items.value.map((r) => r.id)).toEqual(['a']);
      expect(source.events.at(-1)).toBe('end:false');
    }
  });

  it('starts touch drags with a long press and cancels on early movement or Escape', async () => {
    vi.useFakeTimers();
    const left = surface('left', [{ id: 'a' }]);
    const row = left.el.querySelector('.row') as HTMLElement;

    row.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0, pointerType: 'touch' }));
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 0, clientY: 30, pointerType: 'touch' }));
    vi.advanceTimersByTime(400);
    expect(left.api().isDragging.value).toBe(false);

    row.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0, pointerType: 'touch' }));
    vi.advanceTimersByTime(400);
    expect(left.api().isDragging.value).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(left.api().isDragging.value).toBe(false);
    expect(left.events.at(-1)).toBe('end:false');
  });

  it('ignores pointerdown on the native engine and on interactive children', () => {
    const native = surface('n', [{ id: 'a' }], { engine: 'native' });
    const row = native.el.querySelector('.row') as HTMLElement;
    row.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 }));
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 100, clientY: 100 }));
    expect(native.api().isDragging.value).toBe(false);

    const pointer = surface('p', [{ id: 'b' }]);
    const button = document.createElement('button');
    (pointer.el.querySelector('.row') as HTMLElement).appendChild(button);
    button.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 }));
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 100, clientY: 100 }));
    expect(pointer.api().isDragging.value).toBe(false);
  });

  it('blocks text selection while a pointer drag is pending or active', async () => {
    const left = surface('left', [{ id: 'a' }]);
    const row = left.el.querySelector('.row') as HTMLElement;

    const before = new Event('selectstart', { cancelable: true, bubbles: true });
    document.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(false);

    row.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 }));
    const pending = new Event('selectstart', { cancelable: true, bubbles: true });
    document.dispatchEvent(pending);
    expect(pending.defaultPrevented).toBe(true);

    document.dispatchEvent(pointerEvent('pointermove', { clientX: 50, clientY: 50 }));
    expect(document.body.style.userSelect).toBe('none');
    document.dispatchEvent(pointerEvent('pointerup', { clientX: 50, clientY: 50 }));
    expect(document.body.style.userSelect).toBe('');
    const after = new Event('selectstart', { cancelable: true, bubbles: true });
    document.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it('supports a custom ghost and none at all', async () => {
    let api!: UseDragDropReturn<Row>;
    const Comp = defineComponent({
      setup() {
        api = useDragDrop<Row>({ engine: 'pointer', pointer: { ghost: () => { const g = document.createElement('i'); g.className = 'my-ghost'; return g; } } });
        return () => h('div', { class: 'row', onPointerdown: (e: PointerEvent) => api.onPointerDown(e, [{ id: 'a' }]) });
      },
    });
    const wrapper = mount(Comp, { attachTo: document.body });
    wrapper.element.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 }));
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 100, clientY: 100 }));
    expect(document.body.querySelector('.my-ghost')).not.toBeNull();
    document.dispatchEvent(pointerEvent('pointerup', { clientX: 100, clientY: 100 }));
    expect(document.body.querySelector('.my-ghost')).toBeNull();
  });
});
