import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import CoarPopover from './CoarPopover.vue';

// Mock the overlay-service: assert the open() call and track whether close() was invoked.
// Panel rendering is the service's responsibility and is covered by the playground + E2E.
const mockOpen = vi.fn();
const mockClose = vi.fn();
let lastRef: ReturnType<typeof createMockOverlayRef> | null = null;

function createMockOverlayRef() {
  let isClosed = false;
  let resolveAfterClosed: (value?: unknown) => void = () => {};
  const afterClosed = new Promise<unknown>((resolve) => {
    resolveAfterClosed = resolve;
  });
  return {
    close: (...args: unknown[]) => {
      isClosed = true;
      mockClose(...args);
      resolveAfterClosed();
    },
    get isClosed() {
      return isClosed;
    },
    afterClosed,
    panelElement: null,
    updatePosition: vi.fn(),
    /** Test helper — simulate external close (outside-click / escape driven by service). */
    _fakeExternalClose() {
      isClosed = true;
      resolveAfterClosed();
    },
  };
}

vi.mock('../overlay/useOverlay', () => ({
  getOverlayService: () => ({
    open: (...args: unknown[]) => {
      mockOpen(...args);
      lastRef = createMockOverlayRef();
      return lastRef;
    },
    instances: { value: [] },
    closeAll: vi.fn(),
    onPanelMounted: vi.fn(),
  }),
  useOverlayParent: () => undefined,
}));

function createWrapper(
  props: Record<string, unknown> = {},
  contentSlot = '<p>Panel content</p>',
): VueWrapper {
  return mount(CoarPopover, {
    props: { mode: 'click', ...props },
    slots: {
      default: '<button>Trigger</button>',
      content: contentSlot,
    },
    attachTo: document.body,
  });
}

describe('CoarPopover', () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    mockOpen.mockClear();
    mockClose.mockClear();
    lastRef = null;
  });

  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
  });

  describe('rendering', () => {
    it('should render trigger slot', () => {
      wrapper = createWrapper();
      expect(wrapper.find('.coar-popover-trigger button').text()).toBe('Trigger');
    });

    it('should not open overlay initially', () => {
      wrapper = createWrapper();
      expect(mockOpen).not.toHaveBeenCalled();
    });
  });

  describe('click mode', () => {
    it('should open overlay on click', async () => {
      wrapper = createWrapper({ mode: 'click' });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(mockOpen).toHaveBeenCalledTimes(1);
    });

    it('should toggle closed on second click', async () => {
      wrapper = createWrapper({ mode: 'click' });
      const trigger = wrapper.find('.coar-popover-trigger');
      await trigger.trigger('click');
      expect(mockOpen).toHaveBeenCalledTimes(1);
      await trigger.trigger('click');
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('passes dismiss.outsideClick=true to the service (so click-mode respects outside clicks)', async () => {
      wrapper = createWrapper({ mode: 'click' });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      const spec = (mockOpen.mock.calls[0][0] as { spec: { dismiss: { outsideClick: boolean } } })
        .spec;
      expect(spec.dismiss.outsideClick).toBe(true);
    });
  });

  describe('hover mode', () => {
    it('should open on mouseenter', async () => {
      wrapper = createWrapper({ mode: 'hover' });
      await wrapper.find('.coar-popover').trigger('mouseenter');
      expect(mockOpen).toHaveBeenCalledTimes(1);
    });

    it('should close after mouseleave with delay', async () => {
      vi.useFakeTimers();
      wrapper = createWrapper({ mode: 'hover' });
      await wrapper.find('.coar-popover').trigger('mouseenter');
      expect(mockOpen).toHaveBeenCalledTimes(1);

      await wrapper.find('.coar-popover').trigger('mouseleave');
      // Still open during delay
      expect(mockClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(80);
      await nextTick();
      expect(mockClose).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('passes dismiss.outsideClick=false to the service (so hover-out timer drives close)', async () => {
      wrapper = createWrapper({ mode: 'hover' });
      await wrapper.find('.coar-popover').trigger('mouseenter');
      const spec = (mockOpen.mock.calls[0][0] as { spec: { dismiss: { outsideClick: boolean } } })
        .spec;
      expect(spec.dismiss.outsideClick).toBe(false);
    });
  });

  describe('both mode', () => {
    it('should open on hover and stay open after click (pinned)', async () => {
      vi.useFakeTimers();
      wrapper = createWrapper({ mode: 'both' });

      // Open via hover
      await wrapper.find('.coar-popover').trigger('mouseenter');
      expect(mockOpen).toHaveBeenCalledTimes(1);

      // Pin via click
      await wrapper.find('.coar-popover-trigger').trigger('click');

      // Leave should not close (pinned)
      await wrapper.find('.coar-popover').trigger('mouseleave');
      vi.advanceTimersByTime(200);
      await nextTick();
      expect(mockClose).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('disabled', () => {
    it('should not open when disabled', async () => {
      wrapper = createWrapper({ mode: 'click', disabled: true });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it('should close when disabled becomes true', async () => {
      wrapper = createWrapper({ mode: 'click', disabled: false });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(mockOpen).toHaveBeenCalledTimes(1);

      await wrapper.setProps({ disabled: true });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('spec wiring', () => {
    it('forwards interactive prop into the panel inputs', async () => {
      wrapper = createWrapper({ mode: 'click', interactive: false });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      const inputs = (mockOpen.mock.calls[0][0] as { inputs: { interactive: boolean } }).inputs;
      expect(inputs.interactive).toBe(false);
    });

    it('sets a11y role based on interactive flag', async () => {
      wrapper = createWrapper({ mode: 'click', interactive: false });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      const spec = (mockOpen.mock.calls[0][0] as { spec: { a11y: { role: string } } }).spec;
      expect(spec.a11y.role).toBe('tooltip');

      mockOpen.mockClear();
      wrapper.unmount();

      wrapper = createWrapper({ mode: 'click', interactive: true });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      const spec2 = (mockOpen.mock.calls[0][0] as { spec: { a11y: { role: string } } }).spec;
      expect(spec2.a11y.role).toBe('dialog');
    });

    it('passes the trigger element as the anchor', async () => {
      wrapper = createWrapper({ mode: 'click' });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      const spec = (
        mockOpen.mock.calls[0][0] as {
          spec: { anchor: { kind: string; element: HTMLElement } };
        }
      ).spec;
      expect(spec.anchor.kind).toBe('element');
      expect(spec.anchor.element.className).toContain('coar-popover-trigger');
    });

    it('respects the offset prop in the position spec', async () => {
      wrapper = createWrapper({ mode: 'click', offset: 42 });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      const spec = (mockOpen.mock.calls[0][0] as { spec: { position: { offset: number } } }).spec;
      expect(spec.position.offset).toBe(42);
    });
  });

  describe('aria attributes', () => {
    it('sets aria-haspopup="dialog" on interactive trigger', () => {
      wrapper = createWrapper({ mode: 'click', interactive: true });
      expect(wrapper.find('.coar-popover-trigger').attributes('aria-haspopup')).toBe('dialog');
    });

    it('omits aria-haspopup on non-interactive trigger', () => {
      wrapper = createWrapper({ mode: 'click', interactive: false });
      expect(wrapper.find('.coar-popover-trigger').attributes('aria-haspopup')).toBeUndefined();
    });

    it('updates aria-expanded when the popover opens and closes', async () => {
      wrapper = createWrapper({ mode: 'click', interactive: true });
      const trigger = wrapper.find('.coar-popover-trigger');
      expect(trigger.attributes('aria-expanded')).toBe('false');
      await trigger.trigger('click');
      expect(trigger.attributes('aria-expanded')).toBe('true');
      await trigger.trigger('click');
      expect(trigger.attributes('aria-expanded')).toBe('false');
    });
  });
});
