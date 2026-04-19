import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { defineComponent, h, ref, nextTick, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useVirtualList, type UseVirtualListReturn } from './useVirtualList';

/** Mount a harness that exposes the composable + fakes a scroll container. */
function harness(options: {
  count: Ref<number>;
  itemSize: Ref<number | ((index: number) => number)>;
  overscan?: Ref<number>;
  viewportHeight?: number;
}) {
  let api: UseVirtualListReturn | null = null;
  const Host = defineComponent({
    setup() {
      const scrollEl = ref<HTMLElement | null>(null);
      api = useVirtualList({
        count: options.count,
        itemSize: options.itemSize,
        overscan: options.overscan,
        scrollElement: scrollEl,
      });
      return () =>
        h('div', {
          ref: (el) => { scrollEl.value = el as HTMLElement | null; },
          style: {
            overflow: 'auto',
            height: `${options.viewportHeight ?? 100}px`,
          },
        });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  const scrollEl = wrapper.element as HTMLElement;
  // jsdom doesn't compute clientHeight from CSS, so stub it.
  Object.defineProperty(scrollEl, 'clientHeight', {
    configurable: true,
    get: () => options.viewportHeight ?? 100,
  });
  // Force re-read of the now-populated clientHeight.
  scrollEl.dispatchEvent(new Event('scroll'));
  return { wrapper, scrollEl, api: () => api! };
}

describe('useVirtualList', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reports totalSize for fixed item size', async () => {
    const { api } = harness({ count: ref(100), itemSize: ref(30) });
    await nextTick();
    expect(api().totalSize.value).toBe(3000);
  });

  it('reports totalSize for per-index item size', async () => {
    const sizeFn = (i: number) => (i % 2 === 0 ? 20 : 40);
    const { api } = harness({ count: ref(10), itemSize: ref(sizeFn) });
    await nextTick();
    // 5× 20 + 5× 40 = 300
    expect(api().totalSize.value).toBe(300);
  });

  it('offsetFor returns cumulative position', async () => {
    const { api } = harness({ count: ref(10), itemSize: ref(30) });
    await nextTick();
    expect(api().offsetFor(0)).toBe(0);
    expect(api().offsetFor(1)).toBe(30);
    expect(api().offsetFor(5)).toBe(150);
    expect(api().offsetFor(10)).toBe(300); // past-the-end offset == totalSize
  });

  it('virtualRows contains only viewport + overscan rows at scrollTop=0', async () => {
    const { scrollEl, api } = harness({
      count: ref(100),
      itemSize: ref(30),
      overscan: ref(2),
      viewportHeight: 90, // three rows visible (0,1,2)
    });
    await nextTick();
    // Trigger the scroll handler once so composable reads viewportHeight via clientHeight.
    scrollEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    const rows = api().virtualRows.value;
    // Visible: 0..2, overscan 2 after → 0..4 (no overscan before since we're at top).
    expect(rows.map((r) => r.index)).toEqual([0, 1, 2, 3, 4]);
    expect(rows[0]).toMatchObject({ index: 0, start: 0, size: 30 });
    expect(rows[3]).toMatchObject({ index: 3, start: 90, size: 30 });
  });

  it('virtualRows shifts when the container scrolls', async () => {
    const { scrollEl, api } = harness({
      count: ref(100),
      itemSize: ref(30),
      overscan: ref(1),
      viewportHeight: 90,
    });
    await nextTick();
    scrollEl.scrollTop = 300; // items [10..12] visible
    scrollEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    const rows = api().virtualRows.value;
    // Visible 10..12 + overscan 1 on each side → 9..13
    expect(rows.map((r) => r.index)).toEqual([9, 10, 11, 12, 13]);
  });

  it('handles per-index item size in virtualRows', async () => {
    const sizeFn = (i: number) => (i < 3 ? 50 : 20);
    const { scrollEl, api } = harness({
      count: ref(10),
      itemSize: ref(sizeFn),
      overscan: ref(0),
      viewportHeight: 100,
    });
    await nextTick();
    scrollEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    // Sizes 50/50/50/20/20/...; offsets 0,50,100,150,170,...
    // Viewport 0..100: items 0 (0..50) + 1 (50..100) fully in, item 2 starts AT 100 → not visible.
    const rows = api().virtualRows.value;
    expect(rows.map((r) => r.index)).toEqual([0, 1]);
    expect(rows[0]).toMatchObject({ index: 0, start: 0, size: 50 });
    expect(rows[1]).toMatchObject({ index: 1, start: 50, size: 50 });
  });

  it('returns empty virtualRows when count is zero', async () => {
    const { api } = harness({ count: ref(0), itemSize: ref(30) });
    await nextTick();
    expect(api().virtualRows.value).toEqual([]);
    expect(api().totalSize.value).toBe(0);
  });

  it('scrollToIndex(align=start) sets scrollTop to offset', async () => {
    const { scrollEl, api } = harness({ count: ref(100), itemSize: ref(30), viewportHeight: 100 });
    await nextTick();
    api().scrollToIndex(20, 'start');
    expect(scrollEl.scrollTop).toBe(600);
  });

  it('scrollToIndex(align=end) places the item at the bottom of the viewport', async () => {
    const { scrollEl, api } = harness({ count: ref(100), itemSize: ref(30), viewportHeight: 100 });
    await nextTick();
    api().scrollToIndex(10, 'end');
    // offset(11) = 330, minus viewport 100 = 230.
    expect(scrollEl.scrollTop).toBe(230);
  });

  it('scrollToIndex(align=auto) does nothing when already visible', async () => {
    const { scrollEl, api } = harness({ count: ref(100), itemSize: ref(30), viewportHeight: 100 });
    await nextTick();
    scrollEl.scrollTop = 150;
    scrollEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    // Row 6: offset 180..210, currentTop=150, currentBottom=250 → inside.
    api().scrollToIndex(6, 'auto');
    expect(scrollEl.scrollTop).toBe(150);
  });

  it('scrollToIndex clamps to valid scroll range', async () => {
    const { scrollEl, api } = harness({ count: ref(10), itemSize: ref(30), viewportHeight: 200 });
    await nextTick();
    // totalSize=300, viewport=200, max scroll=100
    api().scrollToIndex(9, 'start');
    expect(scrollEl.scrollTop).toBe(100);
  });

  it('recomputes offsets when count changes', async () => {
    const count = ref(5);
    const { api } = harness({ count, itemSize: ref(30) });
    await nextTick();
    expect(api().totalSize.value).toBe(150);
    count.value = 20;
    await nextTick();
    expect(api().totalSize.value).toBe(600);
  });

  it('recomputes offsets when itemSize changes', async () => {
    const itemSize = ref<number | ((i: number) => number)>(30);
    const { api } = harness({ count: ref(10), itemSize });
    await nextTick();
    expect(api().totalSize.value).toBe(300);
    itemSize.value = 50;
    await nextTick();
    expect(api().totalSize.value).toBe(500);
  });
});
