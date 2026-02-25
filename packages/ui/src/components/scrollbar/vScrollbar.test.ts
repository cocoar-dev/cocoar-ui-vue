import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { vScrollbar, getScrollbarInstance } from './vScrollbar';

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
  (OverlayScrollbars as any).plugin = vi.fn();
  const ClickScrollPlugin = {};
  return { OverlayScrollbars, ClickScrollPlugin };
});

function createWrapper(options: any = {}, template?: string) {
  const Comp = defineComponent({
    directives: { scrollbar: vScrollbar },
    template: template ?? '<div v-scrollbar="opts" style="height: 200px;">Content</div>',
    setup() {
      const opts = ref(options);
      return { opts };
    },
  });
  return mount(Comp, { attachTo: document.body });
}

describe('vScrollbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock requestIdleCallback to run immediately
    vi.stubGlobal('requestIdleCallback', (cb: Function) => { cb(); return 0; });
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
    const opts = ref<any>({ theme: 'dark' });
    const Comp = defineComponent({
      directives: { scrollbar: vScrollbar },
      template: '<div v-scrollbar="opts">Content</div>',
      setup() { return { opts }; },
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
    vi.mocked(OverlayScrollbars as any).mockClear();

    const wrapper = createWrapper(false, '<div v-scrollbar="opts">Content</div>');
    await nextTick();

    expect(OverlayScrollbars).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('destroys when updated to false', async () => {
    const opts = ref<any>({});
    const Comp = defineComponent({
      directives: { scrollbar: vScrollbar },
      template: '<div v-scrollbar="opts">Content</div>',
      setup() { return { opts }; },
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
    vi.mocked(OverlayScrollbars as any).mockClear();

    // Remove requestIdleCallback to verify it's not used
    vi.stubGlobal('requestIdleCallback', undefined);

    const wrapper = createWrapper({ defer: false });
    // No need for nextTick since defer: false means sync init
    expect(OverlayScrollbars).toHaveBeenCalled();
    wrapper.unmount();
  });
});
