import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { useVisualViewport, visualViewportMetrics } from './useVisualViewport';
import { setCoarKeyboardInset } from './keyboardInset';

describe('visualViewportMetrics', () => {
  it('measures the keyboard as the inset below the visible part', () => {
    expect(visualViewportMetrics(800, { height: 500, offsetTop: 0, scale: 1 })).toEqual({ height: 500, bottomInset: 300 });
  });

  it('accounts for a page panned up by the browser', () => {
    expect(visualViewportMetrics(800, { height: 500, offsetTop: 100, scale: 1 })).toEqual({ height: 500, bottomInset: 200 });
  });

  it('is null while pinch-zoomed', () => {
    expect(visualViewportMetrics(800, { height: 400, offsetTop: 50, scale: 2 })).toBeNull();
  });

  it('combines native and browser occlusion without adding them', () => {
    expect(visualViewportMetrics(874, { height: 874, offsetTop: 0, scale: 1 }, 328))
      .toEqual({ height: 546, bottomInset: 328 });
    expect(visualViewportMetrics(874, { height: 546, offsetTop: 0, scale: 1 }, 328))
      .toEqual({ height: 546, bottomInset: 328 });
    expect(visualViewportMetrics(874, { height: 500, offsetTop: 0, scale: 1 }, 328))
      .toEqual({ height: 500, bottomInset: 374 });
  });

  it('accounts for panning together with native occlusion and caps it at the layout', () => {
    expect(visualViewportMetrics(874, { height: 600, offsetTop: 100, scale: 1 }, 328))
      .toEqual({ height: 446, bottomInset: 328 });
    expect(visualViewportMetrics(500, { height: 500, offsetTop: 0, scale: 1 }, 800))
      .toEqual({ height: 0, bottomInset: 500 });
  });
});

class FakeVisualViewport extends EventTarget {
  height = 800;
  offsetTop = 0;
  scale = 1;
}

function mountProbe() {
  let state!: ReturnType<typeof useVisualViewport>;
  const wrapper = mount(defineComponent({
    setup() {
      state = useVisualViewport();
      return () => h('div');
    },
  }));
  return { wrapper, state };
}

describe('useVisualViewport', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!.get!;
  let frameHeight: number | undefined;
  beforeEach(() => {
    frameHeight = undefined;
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-coar-viewport-frame')
        ? frameHeight ?? window.innerHeight
        : offsetHeight.call(this);
    });
  });
  afterEach(() => {
    setCoarKeyboardInset(0);
    vi.restoreAllMocks();
    if (original) Object.defineProperty(window, 'visualViewport', original);
    else delete (window as { visualViewport?: unknown }).visualViewport;
  });

  it('uses the fixed layout frame when Safari pans and shortens innerHeight', () => {
    const viewport = new FakeVisualViewport();
    viewport.height = 384;
    viewport.offsetTop = 161;
    frameHeight = 714;
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(714);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(553);
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    const { wrapper, state } = mountProbe();
    expect(state.metrics.value).toEqual({ height: 384, bottomInset: 169 });
    viewport.offsetTop = 330;
    viewport.dispatchEvent(new Event('scroll'));
    expect(state.metrics.value).toEqual({ height: 384, bottomInset: 0 });
    wrapper.unmount();
  });

  it('uses the expanded fixed frame when Chrome hides its toolbar but clientHeight stays small', () => {
    const viewport = new FakeVisualViewport();
    viewport.height = 868;
    frameHeight = 868;
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(812);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(868);
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    const { wrapper, state } = mountProbe();
    expect(state.metrics.value).toEqual({ height: 868, bottomInset: 0 });
    viewport.height = 500;
    viewport.dispatchEvent(new Event('resize'));
    expect(state.metrics.value).toEqual({ height: 500, bottomInset: 368 });
    wrapper.unmount();
  });

  it('excludes a classic horizontal scrollbar from the measured fixed frame', () => {
    const viewport = new FakeVisualViewport();
    viewport.height = 685;
    frameHeight = 685;
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(685);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(700);
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    const { wrapper, state } = mountProbe();
    expect(state.metrics.value).toEqual({ height: 685, bottomInset: 0 });
    expect(document.querySelectorAll('[data-coar-viewport-frame]')).toHaveLength(1);
    wrapper.unmount();
    expect(document.querySelector('[data-coar-viewport-frame]')).toBeNull();
  });

  it('retains native occlusion across mounts and resets on keyboard dismissal', () => {
    frameHeight = 874;
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(874);
    Object.defineProperty(window, 'visualViewport', { value: null, configurable: true });
    setCoarKeyboardInset(328);
    const { wrapper, state } = mountProbe();
    expect(state.metrics.value).toEqual({ height: 546, bottomInset: 328 });
    setCoarKeyboardInset(0);
    expect(state.metrics.value).toBeNull();
    wrapper.unmount();
    setCoarKeyboardInset(200);
    expect(state.metrics.value).toBeNull();
  });

  it('remeasures the layout on window resize even without visualViewport', () => {
    frameHeight = 874;
    const layout = vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(874);
    const inner = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(874);
    Object.defineProperty(window, 'visualViewport', { value: null, configurable: true });
    const { wrapper, state } = mountProbe();
    setCoarKeyboardInset(328);
    layout.mockReturnValue(600);
    inner.mockReturnValue(600);
    frameHeight = 600;
    window.dispatchEvent(new Event('resize'));
    expect(state.metrics.value).toEqual({ height: 272, bottomInset: 328 });
    wrapper.unmount();
  });

  it('rejects invalid native insets without changing the current one', () => {
    frameHeight = 800;
    setCoarKeyboardInset(100);
    for (const value of [-1, NaN, Infinity]) {
      expect(() => setCoarKeyboardInset(value)).toThrow(RangeError);
    }
    Object.defineProperty(window, 'visualViewport', { value: null, configurable: true });
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800);
    const { wrapper, state } = mountProbe();
    expect(state.metrics.value).toEqual({ height: 700, bottomInset: 100 });
    wrapper.unmount();
  });

  it('stays null where the browser has no visual viewport', () => {
    Object.defineProperty(window, 'visualViewport', { value: null, configurable: true });
    const { wrapper, state } = mountProbe();
    expect(state.metrics.value).toBeNull();
    wrapper.unmount();
  });

  it('follows resize events and stops after unmount', async () => {
    const viewport = new FakeVisualViewport();
    viewport.height = window.innerHeight;
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    const { wrapper, state } = mountProbe();
    expect(state.metrics.value).toEqual({ height: window.innerHeight, bottomInset: 0 });

    viewport.height = window.innerHeight - 300;
    viewport.dispatchEvent(new Event('resize'));
    await nextTick();
    expect(state.metrics.value).toEqual({ height: window.innerHeight - 300, bottomInset: 300 });

    wrapper.unmount();
    viewport.height = window.innerHeight;
    viewport.dispatchEvent(new Event('resize'));
    expect(state.metrics.value?.bottomInset).toBe(300);
  });
});
