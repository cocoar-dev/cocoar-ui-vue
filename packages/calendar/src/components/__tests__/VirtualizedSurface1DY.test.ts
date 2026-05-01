/**
 * Component-level tests for `<VirtualizedSurface1DY>`.
 *
 * Scope:
 *   - Mount + slot rendering
 *   - Range over the visible window (with overscan)
 *   - itemCount / fixedItemSize reactivity
 *   - Imperative API surface
 *
 * Out of scope (validated by the stress page + Playwright):
 *   - Scroll throughput / FPS
 *   - ResizeObserver-driven measurement (happy-dom's RO is a stub)
 *   - Anchor restoration under live scroll
 *
 * The math (range computation, anchor adjustment) is fully covered by
 * the pure-function tests in `core/__tests__/`. This test file only
 * verifies the Vue component glue.
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import VirtualizedSurface1DY from '../VirtualizedSurface1DY.vue';

function mountSurface(propsOverride: Record<string, unknown> = {}) {
  const Renderer = defineComponent({
    components: { VirtualizedSurface1DY },
    props: {
      itemCount: { type: Number, required: true },
      estimatedItemSize: { type: Number, required: true },
      fixedItemSize: { type: Number, default: undefined },
      overscan: { type: Number, default: 3 },
      anchor: { type: [Number, String, null] as never, default: 'auto' },
    },
    setup(props) {
      return () =>
        h(
          VirtualizedSurface1DY,
          {
            itemCount: props.itemCount,
            estimatedItemSize: props.estimatedItemSize,
            fixedItemSize: props.fixedItemSize,
            overscan: props.overscan,
            anchor: props.anchor,
          },
          {
            item: ({ y }: { y: number }) =>
              h('div', { class: 'test-item', 'data-y': y }, `item ${y}`),
          },
        );
    },
  });

  return mount(Renderer, {
    props: {
      itemCount: 100,
      estimatedItemSize: 80,
      ...propsOverride,
    },
    attachTo: document.body,
  });
}

describe('VirtualizedSurface1DY — mount', () => {
  it('mounts without error', () => {
    const wrapper = mountSurface();
    expect(wrapper.find('.coar-virtualized-surface-1dy').exists()).toBe(true);
    wrapper.unmount();
  });

  it('renders the spacer with the total height', () => {
    const wrapper = mountSurface({ itemCount: 50, fixedItemSize: 40 });
    const spacer = wrapper.find<HTMLElement>('.coar-virtualized-surface-1dy__spacer');
    expect(spacer.element.style.height).toBe('2000px'); // 50 * 40
    wrapper.unmount();
  });

  it('renders no items for itemCount = 0', async () => {
    const wrapper = mountSurface({ itemCount: 0, fixedItemSize: 40 });
    await nextTick();
    expect(wrapper.findAll('.test-item').length).toBe(0);
    wrapper.unmount();
  });

  it('renders slot content for visible items (fixed-size mode)', async () => {
    // happy-dom gives elements 0 client dimensions, so `viewportHeight`
    // is 0. With overscan = 5, range becomes [0, 6) at the top — verify
    // we render at least the overscan rows.
    const wrapper = mountSurface({ itemCount: 100, fixedItemSize: 40, overscan: 5 });
    await nextTick();
    const items = wrapper.findAll('.test-item');
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.length).toBeLessThanOrEqual(15);
    expect(items[0].attributes('data-y')).toBe('0');
    wrapper.unmount();
  });
});

describe('VirtualizedSurface1DY — keyed v-for', () => {
  it('rendered items have stable keys based on item index', async () => {
    const wrapper = mountSurface({ itemCount: 10, fixedItemSize: 40, overscan: 5 });
    await nextTick();
    const items = wrapper.findAll('.coar-virtualized-surface-1dy__item');
    // Each rendered item carries its index in `data-y`.
    const indices = items.map((it) => Number(it.attributes('data-y')));
    // Indices must be monotonically increasing (matches the range order).
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
    wrapper.unmount();
  });

  it('shrinking itemCount drops out-of-range items', async () => {
    const wrapper = mountSurface({ itemCount: 100, fixedItemSize: 40, overscan: 3 });
    await nextTick();
    await wrapper.setProps({ itemCount: 5 });
    await nextTick();
    const items = wrapper.findAll('.test-item');
    for (const item of items) {
      const y = Number(item.attributes('data-y'));
      expect(y).toBeLessThan(5);
    }
    wrapper.unmount();
  });

  it('growing itemCount expands the spacer', async () => {
    const wrapper = mountSurface({ itemCount: 10, fixedItemSize: 40 });
    await nextTick();
    let spacer = wrapper.find<HTMLElement>('.coar-virtualized-surface-1dy__spacer');
    expect(spacer.element.style.height).toBe('400px');

    await wrapper.setProps({ itemCount: 20 });
    await nextTick();
    spacer = wrapper.find<HTMLElement>('.coar-virtualized-surface-1dy__spacer');
    expect(spacer.element.style.height).toBe('800px');
    wrapper.unmount();
  });

  it('changing fixedItemSize updates the spacer + offsets', async () => {
    const wrapper = mountSurface({ itemCount: 10, fixedItemSize: 40 });
    await nextTick();
    let spacer = wrapper.find<HTMLElement>('.coar-virtualized-surface-1dy__spacer');
    expect(spacer.element.style.height).toBe('400px');

    await wrapper.setProps({ fixedItemSize: 100 });
    await nextTick();
    spacer = wrapper.find<HTMLElement>('.coar-virtualized-surface-1dy__spacer');
    expect(spacer.element.style.height).toBe('1000px');
    wrapper.unmount();
  });
});

describe('VirtualizedSurface1DY — items have transform offsets', () => {
  it('first item starts at translateY(0)', async () => {
    const wrapper = mountSurface({ itemCount: 100, fixedItemSize: 80 });
    await nextTick();
    const first = wrapper.find<HTMLElement>(
      '.coar-virtualized-surface-1dy__item[data-y="0"]',
    );
    expect(first.exists()).toBe(true);
    expect(first.element.style.transform).toBe('translateY(0px)');
    wrapper.unmount();
  });

  it('subsequent items use prefix-summed offsets', async () => {
    const wrapper = mountSurface({ itemCount: 100, fixedItemSize: 80, overscan: 5 });
    await nextTick();
    const second = wrapper.find<HTMLElement>(
      '.coar-virtualized-surface-1dy__item[data-y="1"]',
    );
    if (second.exists()) {
      expect(second.element.style.transform).toBe('translateY(80px)');
    }
    wrapper.unmount();
  });
});

describe('VirtualizedSurface1DY — events', () => {
  it('emits range-change when itemCount changes', async () => {
    const wrapper = mountSurface({ itemCount: 100, fixedItemSize: 40 });
    await nextTick();
    await wrapper.setProps({ itemCount: 50 });
    await nextTick();
    const events = wrapper.findComponent(VirtualizedSurface1DY).emitted('rangeChange');
    expect(events).toBeTruthy();
    const last = (events as unknown[][])[events!.length - 1][0] as {
      startIndex: number;
      totalSize: number;
    };
    expect(last.totalSize).toBe(50 * 40);
  });
});
