import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useVirtualList, type UseVirtualListReturn } from './useVirtualList';

function harness(keys: (string | number)[]) {
  let api: UseVirtualListReturn | null = null;
  const Host = defineComponent({
    setup() {
      const scrollEl = ref<HTMLElement | null>(null);
      api = useVirtualList({
        count: () => keys.length,
        itemSize: 50,
        measure: true,
        itemKey: (index) => keys[index],
        scrollElement: scrollEl,
      });
      return () => h('div', { ref: (el) => { scrollEl.value = el as HTMLElement | null; } });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  const scrollEl = wrapper.element as HTMLElement;
  Object.defineProperty(scrollEl, 'clientHeight', { configurable: true, get: () => 100 });
  scrollEl.dispatchEvent(new Event('scroll'));
  return { wrapper, api: () => api! };
}

function elementWithHeight(height: number): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ height, width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) });
  return el;
}

describe('useVirtualList measurement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses the estimate until a row is measured, then the measured height', async () => {
    const { api } = harness(['a', 'b', 'c']);
    expect(api().totalSize.value).toBe(150);
    expect(api().offsetFor(1)).toBe(50);

    api().measureElement(0, elementWithHeight(80.4));
    await nextTick();
    expect(api().offsetFor(1)).toBe(81);
    expect(api().totalSize.value).toBe(181);
    expect(api().virtualRows.value[0]).toEqual({ index: 0, start: 0, size: 81 });
  });

  it('keeps measured heights by key, not by index', async () => {
    const keys = ['a', 'b', 'c'];
    const { api } = harness(keys);
    api().measureElement(2, elementWithHeight(90));
    await nextTick();
    keys.reverse(); // 'c' is now index 0
    api().invalidateMeasurements('__none__'); // bump the version without dropping keys
    await nextTick();
    expect(api().offsetFor(1)).toBe(90);
  });

  it('ignores zero heights and can be invalidated', async () => {
    const { api } = harness(['a', 'b']);
    api().measureElement(0, elementWithHeight(0));
    await nextTick();
    expect(api().offsetFor(1)).toBe(50);

    api().measureElement(0, elementWithHeight(70));
    await nextTick();
    expect(api().offsetFor(1)).toBe(70);

    api().invalidateMeasurements();
    await nextTick();
    expect(api().offsetFor(1)).toBe(50);
  });

  it('re-measures observed rows after the patch, catching styles applied late', async () => {
    const { api } = harness(['a', 'b']);
    const el = elementWithHeight(60);
    document.body.appendChild(el);
    api().measureElement(0, el);
    await nextTick();
    expect(api().offsetFor(1)).toBe(60);

    // Re-render: the ref callback still sees 60, the parent's new style lands afterwards.
    api().measureElement(0, el);
    el.getBoundingClientRect = () => ({ height: 72, width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) });
    expect(api().offsetFor(1)).toBe(60);
    await nextTick();
    await nextTick();
    expect(api().offsetFor(1)).toBe(72);
  });

  it('does nothing when measuring is off', async () => {
    let api: UseVirtualListReturn | null = null;
    const Host = defineComponent({
      setup() {
        const scrollEl = ref<HTMLElement | null>(null);
        api = useVirtualList({ count: 2, itemSize: 40, scrollElement: scrollEl });
        return () => h('div', { ref: (el) => { scrollEl.value = el as HTMLElement | null; } });
      },
    });
    mount(Host, { attachTo: document.body });
    api!.measureElement(0, elementWithHeight(99));
    await nextTick();
    expect(api!.totalSize.value).toBe(80);
  });
});
