import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { vScrollbar, getScrollbarInstance, quietScrollbars } from './vScrollbar';

// Mock overlayscrollbars
const mockUpdate = vi.fn();
const mockDestroy = vi.fn();
const mockOptions = vi.fn();
const mockElements = vi.fn(() => ({
  viewport: document.createElement('div'),
}));

const mockInstance = {
  update: mockUpdate,
  destroy: mockDestroy,
  options: mockOptions,
  elements: mockElements,
};

vi.mock('overlayscrollbars', () => {
  const OverlayScrollbars = vi.fn(() => mockInstance) as unknown as typeof import('overlayscrollbars').OverlayScrollbars;
  (OverlayScrollbars as unknown as Record<string, unknown>).plugin = vi.fn();
  const ClickScrollPlugin = {};
  return { OverlayScrollbars, ClickScrollPlugin };
});

function createWrapper(options: Record<string, unknown> | boolean = {}, template?: string) {
  const Comp = defineComponent({
    directives: { scrollbar: vScrollbar },
    setup() {
      const opts = ref(options);
      return { opts };
    },
    template: template ?? '<div v-scrollbar="opts" style="height: 200px;">Content</div>',
  });
  return mount(Comp, { attachTo: document.body });
}

describe('vScrollbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock requestIdleCallback to run immediately
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => { cb(); return 0; });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes OverlayScrollbars on mount', async () => {
    const { OverlayScrollbars } = await import('overlayscrollbars');
    const wrapper = createWrapper();
    await nextTick();

    expect(OverlayScrollbars).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('applies data-overlayscrollbars-initialize attribute', () => {
    const wrapper = createWrapper();
    const el = wrapper.find('[data-overlayscrollbars-initialize]');
    expect(el.exists()).toBe(true);
    wrapper.unmount();
  });

  it('passes default options correctly', async () => {
    const { OverlayScrollbars } = await import('overlayscrollbars');
    const wrapper = createWrapper();
    await nextTick();

    const call = (OverlayScrollbars as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1]).toEqual({
      scrollbars: {
        theme: 'os-theme-dark',
        autoHide: 'leave',
        autoHideDelay: 400,
        clickScroll: true,
      },
      overflow: {
        x: 'scroll',
        y: 'scroll',
      },
    });
    wrapper.unmount();
  });

  it('passes custom options', async () => {
    const { OverlayScrollbars } = await import('overlayscrollbars');
    const wrapper = createWrapper({
      theme: 'light',
      autoHide: 'scroll',
      autoHideDelay: 200,
      clickScroll: false,
      overflowX: 'hidden',
      overflowY: 'scroll',
    });
    await nextTick();

    const call = (OverlayScrollbars as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1]).toEqual({
      scrollbars: {
        theme: 'os-theme-light',
        autoHide: 'scroll',
        autoHideDelay: 200,
        clickScroll: false,
      },
      overflow: {
        x: 'hidden',
        y: 'scroll',
      },
    });
    wrapper.unmount();
  });

  it('destroys instance on unmount', async () => {
    const wrapper = createWrapper();
    await nextTick();

    wrapper.unmount();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('updates options when binding value changes', async () => {
    const opts = ref<Record<string, unknown> | boolean>({ theme: 'dark' });
    const Comp = defineComponent({
      directives: { scrollbar: vScrollbar },
      setup() { return { opts }; },
      template: '<div v-scrollbar="opts">Content</div>',
    });
    const wrapper = mount(Comp, { attachTo: document.body });
    await nextTick();

    opts.value = { theme: 'light' };
    await nextTick();

    expect(mockOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollbars: expect.objectContaining({ theme: 'os-theme-light' }),
      }),
    );
    wrapper.unmount();
  });

  it('does not initialize when value is false', async () => {
    const { OverlayScrollbars } = await import('overlayscrollbars');
    vi.mocked(OverlayScrollbars as unknown as ReturnType<typeof vi.fn>).mockClear();

    const wrapper = createWrapper(false, '<div v-scrollbar="opts">Content</div>');
    await nextTick();

    expect(OverlayScrollbars).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('updates and clears overscroll containment when the binding changes', async () => {
    const viewport = document.createElement('div');
    mockElements.mockReturnValue({ viewport });
    const wrapper = createWrapper({ overscrollBehavior: 'contain', defer: false });
    expect(viewport.style.overscrollBehavior).toBe('contain');
    const opts = wrapper.vm as unknown as { opts: Record<string, unknown> };
    opts.opts = { overscrollBehavior: 'auto' };
    await nextTick();
    expect(viewport.style.overscrollBehavior).toBe('auto');
    opts.opts = { overscrollBehavior: 'contain' };
    await nextTick();
    expect(viewport.style.overscrollBehavior).toBe('contain');
    opts.opts = {};
    await nextTick();
    expect(viewport.style.overscrollBehavior).toBe('');
    wrapper.unmount();
    mockElements.mockImplementation(() => ({ viewport: document.createElement('div') }));
  });

  it('does not write default viewport styles on unrelated option updates', async () => {
    const viewport = document.createElement('div');
    mockElements.mockReturnValue({ viewport });
    const wrapper = createWrapper({ defer: false });
    const setOverscroll = vi.spyOn(viewport.style, 'overscrollBehavior', 'set');
    (wrapper.vm as unknown as { opts: Record<string, unknown> }).opts = { theme: 'light' };
    await nextTick();
    expect(setOverscroll).not.toHaveBeenCalled();
    setOverscroll.mockRestore();
    wrapper.unmount();
    mockElements.mockImplementation(() => ({ viewport: document.createElement('div') }));
  });

  it('destroys when updated to false', async () => {
    const opts = ref<Record<string, unknown> | boolean>({});
    const Comp = defineComponent({
      directives: { scrollbar: vScrollbar },
      setup() { return { opts }; },
      template: '<div v-scrollbar="opts">Content</div>',
    });
    const wrapper = mount(Comp, { attachTo: document.body });
    await nextTick();

    opts.value = false;
    await nextTick();

    expect(mockDestroy).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('getScrollbarInstance returns instance for mounted element', async () => {
    const wrapper = createWrapper();
    await nextTick();

    const el = wrapper.element.querySelector('[data-overlayscrollbars-initialize]') as HTMLElement ?? wrapper.element as HTMLElement;
    const instance = getScrollbarInstance(el);
    expect(instance).toBe(mockInstance);
    wrapper.unmount();
  });

  it('initializes immediately when defer is false', async () => {
    const { OverlayScrollbars } = await import('overlayscrollbars');
    vi.mocked(OverlayScrollbars as unknown as ReturnType<typeof vi.fn>).mockClear();

    // Remove requestIdleCallback to verify it's not used
    vi.stubGlobal('requestIdleCallback', undefined);

    const wrapper = createWrapper({ defer: false });
    // No need for nextTick since defer: false means sync init
    expect(OverlayScrollbars).toHaveBeenCalled();
    wrapper.unmount();
  });
});

describe('quietScrollbars', () => {
  const frames: FrameRequestCallback[] = [];
  beforeEach(() => {
    frames.length = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  });
  afterEach(() => vi.unstubAllGlobals());
  const runFrame = () => frames.splice(0).forEach((callback) => callback(0));

  /** An instance that logs sleep and wake, with its host and the viewport inside it. */
  function sleepingInstance(log: boolean[]) {
    const host = document.createElement('div');
    const viewport = host.appendChild(document.createElement('div'));
    const instance = {
      sleep: (sleeping: boolean) => log.push(sleeping),
      elements: () => ({ host, viewport }),
    } as unknown as Parameters<typeof quietScrollbars>[0];
    return { instance, viewport };
  }

  /** Whether a scroll event of the viewport reaches a listener of the viewport. */
  function reachesViewport(viewport: HTMLElement): boolean {
    let reached = false;
    const listener = () => { reached = true; };
    viewport.addEventListener('scroll', listener);
    viewport.dispatchEvent(new Event('scroll'));
    viewport.removeEventListener('scroll', listener);
    return reached;
  }

  it('stops the scroll event of its own measuring after waking, not a scroll to elsewhere', () => {
    const { instance, viewport } = sleepingInstance([]);
    viewport.scrollTop = 0;
    quietScrollbars(instance)();
    runFrame();

    // OverlayScrollbars measured by scrolling and put the viewport back where it was.
    expect(reachesViewport(viewport)).toBe(false);
    viewport.scrollTop = 40;
    expect(reachesViewport(viewport)).toBe(true);
    viewport.scrollTop = 0;

    runFrame();
    runFrame();
    expect(reachesViewport(viewport)).toBe(true);
  });

  it('sleeps for a scroll of the component and wakes in the frame after it', () => {
    const log: boolean[] = [];
    const { instance } = sleepingInstance(log);
    const wake = quietScrollbars(instance);
    expect(log).toEqual([true]);
    wake();
    wake();
    expect(log).toEqual([true]);
    runFrame();
    expect(log).toEqual([true, false]);
  });

  it('wakes only after the last of overlapping scrolls', () => {
    const log: boolean[] = [];
    const { instance } = sleepingInstance(log);
    const first = quietScrollbars(instance);
    const second = quietScrollbars(instance);
    first();
    runFrame();
    expect(log).toEqual([true]);
    second();
    runFrame();
    expect(log).toEqual([true, false]);
  });

  it('does nothing without an instance yet (a deferred scrollbar)', () => {
    expect(() => quietScrollbars(null)()).not.toThrow();
  });
});
