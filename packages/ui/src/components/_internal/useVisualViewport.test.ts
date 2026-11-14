import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { useVisualViewport, visualViewportMetrics } from './useVisualViewport';

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
  afterEach(() => {
    if (original) Object.defineProperty(window, 'visualViewport', original);
    else delete (window as { visualViewport?: unknown }).visualViewport;
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
