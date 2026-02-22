import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarProgressBar from './CoarProgressBar.vue';

function mountProgressBar(props: Record<string, unknown> = {}) {
  return mount(CoarProgressBar, { props });
}

describe('CoarProgressBar', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountProgressBar();
      expect(wrapper.find('.coar-progress-bar').exists()).toBe(true);
    });

    it('should render container and fill', () => {
      const wrapper = mountProgressBar();
      expect(wrapper.find('.coar-progress-bar-container').exists()).toBe(true);
      expect(wrapper.find('.coar-progress-bar-fill').exists()).toBe(true);
    });
  });

  describe('defaults', () => {
    it('should have accent variant by default', () => {
      const wrapper = mountProgressBar();
      expect(wrapper.find('.coar-progress-bar--accent').exists()).toBe(true);
    });

    it('should have m size by default', () => {
      const wrapper = mountProgressBar();
      expect(wrapper.find('.coar-progress-bar--m').exists()).toBe(true);
    });

    it('should not be indeterminate by default', () => {
      const wrapper = mountProgressBar();
      expect(wrapper.find('.coar-progress-bar--indeterminate').exists()).toBe(false);
    });

    it('should not show value by default', () => {
      const wrapper = mountProgressBar();
      expect(wrapper.find('.coar-progress-bar-value').exists()).toBe(false);
    });

    it('should have 0% fill width by default', () => {
      const wrapper = mountProgressBar();
      const fill = wrapper.find('.coar-progress-bar-fill');
      expect(fill.attributes('style')).toContain('width: 0%');
    });
  });

  describe('size variants', () => {
    it.each(['s', 'm', 'l'] as const)('should apply %s size class', (size) => {
      const wrapper = mountProgressBar({ size });
      expect(wrapper.find(`.coar-progress-bar--${size}`).exists()).toBe(true);
    });
  });

  describe('variant classes', () => {
    it.each(['accent', 'success', 'warning', 'error'] as const)(
      'should apply %s variant class',
      (variant) => {
        const wrapper = mountProgressBar({ variant });
        expect(wrapper.find(`.coar-progress-bar--${variant}`).exists()).toBe(true);
      },
    );
  });

  describe('progress value', () => {
    it('should set fill width based on value', () => {
      const wrapper = mountProgressBar({ value: 50 });
      const fill = wrapper.find('.coar-progress-bar-fill');
      expect(fill.attributes('style')).toContain('width: 50%');
    });

    it('should clamp value to 0', () => {
      const wrapper = mountProgressBar({ value: -10 });
      const fill = wrapper.find('.coar-progress-bar-fill');
      expect(fill.attributes('style')).toContain('width: 0%');
    });

    it('should clamp value to 100', () => {
      const wrapper = mountProgressBar({ value: 150 });
      const fill = wrapper.find('.coar-progress-bar-fill');
      expect(fill.attributes('style')).toContain('width: 100%');
    });

    it('should support custom max', () => {
      const wrapper = mountProgressBar({ value: 25, max: 50 });
      const fill = wrapper.find('.coar-progress-bar-fill');
      expect(fill.attributes('style')).toContain('width: 50%');
    });

    it('should handle max of 0', () => {
      const wrapper = mountProgressBar({ value: 50, max: 0 });
      const fill = wrapper.find('.coar-progress-bar-fill');
      expect(fill.attributes('style')).toContain('width: 0%');
    });
  });

  describe('show value', () => {
    it('should not display percentage text by default', () => {
      const wrapper = mountProgressBar();
      expect(wrapper.find('.coar-progress-bar-value').exists()).toBe(false);
    });

    it('should display percentage text when showValue is true', () => {
      const wrapper = mountProgressBar({ showValue: true, value: 75 });
      const valueEl = wrapper.find('.coar-progress-bar-value');
      expect(valueEl.exists()).toBe(true);
      expect(valueEl.text()).toContain('75%');
    });

    it('should not display percentage text when indeterminate', () => {
      const wrapper = mountProgressBar({ showValue: true, indeterminate: true });
      expect(wrapper.find('.coar-progress-bar-value').exists()).toBe(false);
    });
  });

  describe('indeterminate', () => {
    it('should apply indeterminate class', () => {
      const wrapper = mountProgressBar({ indeterminate: true });
      expect(wrapper.find('.coar-progress-bar--indeterminate').exists()).toBe(true);
    });

    it('should set fill width to 100% when indeterminate', () => {
      const wrapper = mountProgressBar({ indeterminate: true });
      const fill = wrapper.find('.coar-progress-bar-fill');
      expect(fill.attributes('style')).toContain('width: 100%');
    });

    it('should not set aria-valuenow when indeterminate', () => {
      const wrapper = mountProgressBar({ indeterminate: true });
      expect(wrapper.find('.coar-progress-bar').attributes('aria-valuenow')).toBeUndefined();
    });
  });

  describe('accessibility', () => {
    it('should have progressbar role', () => {
      const wrapper = mountProgressBar();
      expect(wrapper.find('.coar-progress-bar').attributes('role')).toBe('progressbar');
    });

    it('should set aria-valuenow', () => {
      const wrapper = mountProgressBar({ value: 42 });
      expect(wrapper.find('.coar-progress-bar').attributes('aria-valuenow')).toBe('42');
    });

    it('should set aria-valuemin to 0', () => {
      const wrapper = mountProgressBar();
      expect(wrapper.find('.coar-progress-bar').attributes('aria-valuemin')).toBe('0');
    });

    it('should set aria-valuemax', () => {
      const wrapper = mountProgressBar({ max: 200 });
      expect(wrapper.find('.coar-progress-bar').attributes('aria-valuemax')).toBe('200');
    });

    it('should set aria-label when provided', () => {
      const wrapper = mountProgressBar({ label: 'Upload progress' });
      expect(wrapper.find('.coar-progress-bar').attributes('aria-label')).toBe('Upload progress');
    });

    it('should not set aria-label when empty', () => {
      const wrapper = mountProgressBar();
      expect(wrapper.find('.coar-progress-bar').attributes('aria-label')).toBeUndefined();
    });
  });
});
