import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import CoarPopover from './CoarPopover.vue';

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
    global: { stubs: { Teleport: true } },
    attachTo: document.body,
  });
}

describe('CoarPopover', () => {
  let wrapper: VueWrapper;

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('rendering', () => {
    it('should render trigger slot', () => {
      wrapper = createWrapper();
      expect(wrapper.find('.coar-popover-trigger button').text()).toBe('Trigger');
    });

    it('should not show panel initially', () => {
      wrapper = createWrapper();
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(false);
    });
  });

  describe('click mode', () => {
    it('should open panel on click', async () => {
      wrapper = createWrapper({ mode: 'click' });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);
      expect(wrapper.find('.coar-popover-content').text()).toBe('Panel content');
    });

    it('should toggle closed on second click', async () => {
      wrapper = createWrapper({ mode: 'click' });
      const trigger = wrapper.find('.coar-popover-trigger');
      await trigger.trigger('click');
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);
      await trigger.trigger('click');
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(false);
    });

    it('should close on Escape', async () => {
      wrapper = createWrapper({ mode: 'click' });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await nextTick();
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(false);
    });
  });

  describe('hover mode', () => {
    it('should open on mouseenter', async () => {
      wrapper = createWrapper({ mode: 'hover' });
      await wrapper.find('.coar-popover').trigger('mouseenter');
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);
    });

    it('should close after mouseleave with delay', async () => {
      vi.useFakeTimers();
      wrapper = createWrapper({ mode: 'hover' });
      await wrapper.find('.coar-popover').trigger('mouseenter');
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);

      await wrapper.find('.coar-popover').trigger('mouseleave');
      // Still open during delay
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);

      vi.advanceTimersByTime(80);
      await nextTick();
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(false);
      vi.useRealTimers();
    });

    it('should stay open when hovering panel', async () => {
      vi.useFakeTimers();
      wrapper = createWrapper({ mode: 'hover' });
      await wrapper.find('.coar-popover').trigger('mouseenter');
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);

      await wrapper.find('.coar-popover').trigger('mouseleave');
      await wrapper.find('.coar-popover-panel').trigger('mouseenter');

      vi.advanceTimersByTime(200);
      await nextTick();
      // Still open because panel is hovered
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('both mode', () => {
    it('should open on hover and pin on click', async () => {
      vi.useFakeTimers();
      wrapper = createWrapper({ mode: 'both' });

      // Open via hover
      await wrapper.find('.coar-popover').trigger('mouseenter');
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);

      // Pin via click
      await wrapper.find('.coar-popover-trigger').trigger('click');

      // Leave should not close (pinned)
      await wrapper.find('.coar-popover').trigger('mouseleave');
      vi.advanceTimersByTime(200);
      await nextTick();
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('disabled', () => {
    it('should not open when disabled', async () => {
      wrapper = createWrapper({ mode: 'click', disabled: true });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(false);
    });

    it('should close when disabled becomes true', async () => {
      wrapper = createWrapper({ mode: 'click', disabled: false });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(true);

      await wrapper.setProps({ disabled: true });
      expect(wrapper.find('.coar-popover-panel').exists()).toBe(false);
    });
  });

  describe('interactive', () => {
    it('should set pointer-events none when non-interactive', async () => {
      wrapper = createWrapper({ mode: 'click', interactive: false });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(wrapper.find('.coar-popover-panel--non-interactive').exists()).toBe(true);
    });

    it('should allow pointer events by default', async () => {
      wrapper = createWrapper({ mode: 'click' });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(wrapper.find('.coar-popover-panel--non-interactive').exists()).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('should have role tooltip on panel', async () => {
      wrapper = createWrapper({ mode: 'click' });
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(wrapper.find('.coar-popover-panel').attributes('role')).toBe('tooltip');
    });
  });

  describe('content slot', () => {
    it('should render custom content', async () => {
      wrapper = createWrapper(
        { mode: 'click' },
        '<div class="custom-content"><strong>Rich</strong> content</div>',
      );
      await wrapper.find('.coar-popover-trigger').trigger('click');
      expect(wrapper.find('.custom-content strong').text()).toBe('Rich');
    });
  });
});
