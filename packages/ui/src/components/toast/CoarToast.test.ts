import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import CoarToastItem from './CoarToastItem.vue';

function createWrapper(props: Record<string, unknown> = {}): VueWrapper {
  return mount(CoarToastItem, {
    props: {
      variant: 'success',
      title: '',
      message: 'Operation completed',
      duration: 5000,
      dismissible: true,
      showProgress: true,
      action: null,
      ...props,
    },
    global: {
      stubs: { CoarIcon: { template: '<span class="icon-stub" />', props: ['name', 'size'] } },
    },
  });
}

describe('CoarToastItem', () => {
  describe('rendering', () => {
    it('should render message', () => {
      const wrapper = createWrapper({ message: 'Hello world' });
      expect(wrapper.find('.coar-toast-message').text()).toBe('Hello world');
    });

    it('should render title when provided', () => {
      const wrapper = createWrapper({ title: 'Success' });
      expect(wrapper.find('.coar-toast-title').text()).toBe('Success');
    });

    it('should not render title when empty', () => {
      const wrapper = createWrapper({ title: '' });
      expect(wrapper.find('.coar-toast-title').exists()).toBe(false);
    });

    it('should apply variant class', () => {
      const wrapper = createWrapper({ variant: 'error' });
      expect(wrapper.find('.coar-toast--error').exists()).toBe(true);
    });

    it('should apply no-title class when no title', () => {
      const wrapper = createWrapper({ title: '' });
      expect(wrapper.find('.coar-toast--no-title').exists()).toBe(true);
    });

    it('should set role="alert" for error variant', () => {
      const wrapper = createWrapper({ variant: 'error' });
      expect(wrapper.find('.coar-toast').attributes('role')).toBe('alert');
    });

    it('should set role="status" for non-error variants', () => {
      const wrapper = createWrapper({ variant: 'success' });
      expect(wrapper.find('.coar-toast').attributes('role')).toBe('status');
    });
  });

  describe('dismiss button', () => {
    it('should show dismiss button when dismissible', () => {
      const wrapper = createWrapper({ dismissible: true });
      expect(wrapper.find('.coar-toast-close').exists()).toBe(true);
    });

    it('should not show dismiss button when not dismissible', () => {
      const wrapper = createWrapper({ dismissible: false });
      expect(wrapper.find('.coar-toast-close').exists()).toBe(false);
    });

    it('should emit dismissed on close click', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-toast-close').trigger('click');
      expect(wrapper.emitted('dismissed')).toHaveLength(1);
    });
  });

  describe('action button', () => {
    it('should show action button when action provided', () => {
      const cb = vi.fn();
      const wrapper = createWrapper({ action: { label: 'Undo', callback: cb } });
      expect(wrapper.find('.coar-toast-action-btn').text()).toBe('Undo');
    });

    it('should not show action button when no action', () => {
      const wrapper = createWrapper({ action: null });
      expect(wrapper.find('.coar-toast-action-btn').exists()).toBe(false);
    });

    it('should call action callback on click', async () => {
      const cb = vi.fn();
      const wrapper = createWrapper({ action: { label: 'Undo', callback: cb } });
      await wrapper.find('.coar-toast-action-btn').trigger('click');
      expect(cb).toHaveBeenCalledOnce();
      expect(wrapper.emitted('actionClicked')).toHaveLength(1);
    });
  });

  describe('progress bar', () => {
    it('should show progress bar when enabled and duration > 0', () => {
      const wrapper = createWrapper({ showProgress: true, duration: 5000 });
      expect(wrapper.find('.coar-toast-progress').exists()).toBe(true);
    });

    it('should not show progress bar when duration is 0', () => {
      const wrapper = createWrapper({ showProgress: true, duration: 0 });
      expect(wrapper.find('.coar-toast-progress').exists()).toBe(false);
    });

    it('should not show progress bar when disabled', () => {
      const wrapper = createWrapper({ showProgress: false, duration: 5000 });
      expect(wrapper.find('.coar-toast-progress').exists()).toBe(false);
    });

    it('should set animation duration', () => {
      const wrapper = createWrapper({ showProgress: true, duration: 3000 });
      const bar = wrapper.find('.coar-toast-progress-bar');
      expect(bar.attributes('style')).toContain('animation-duration: 3000ms');
    });
  });

  describe('auto-close', () => {
    it('should emit dismissed after duration', () => {
      vi.useFakeTimers();
      const wrapper = createWrapper({ duration: 2000 });
      (wrapper.vm as unknown as { startAutoClose: () => void }).startAutoClose();

      vi.advanceTimersByTime(1999);
      expect(wrapper.emitted('dismissed')).toBeUndefined();

      vi.advanceTimersByTime(1);
      expect(wrapper.emitted('dismissed')).toHaveLength(1);
      vi.useRealTimers();
    });

    it('should not auto-close when duration is 0', () => {
      vi.useFakeTimers();
      const wrapper = createWrapper({ duration: 0 });
      (wrapper.vm as unknown as { startAutoClose: () => void }).startAutoClose();

      vi.advanceTimersByTime(10000);
      expect(wrapper.emitted('dismissed')).toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe('variants', () => {
    for (const variant of ['success', 'error', 'warning', 'info'] as const) {
      it(`should render ${variant} variant`, () => {
        const wrapper = createWrapper({ variant });
        expect(wrapper.find(`.coar-toast--${variant}`).exists()).toBe(true);
      });
    }
  });
});
