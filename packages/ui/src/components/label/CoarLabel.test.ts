import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarLabel from './CoarLabel.vue';

function mountLabel(props: Record<string, unknown> = {}, slots?: Record<string, string>) {
  return mount(CoarLabel, { props, slots });
}

describe('CoarLabel', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountLabel();
      expect(wrapper.find('.coar-label').exists()).toBe(true);
    });

    it('should render text prop', () => {
      const wrapper = mountLabel({ text: 'Test Label' });
      expect(wrapper.text()).toContain('Test Label');
    });

    it('should render slot content', () => {
      const wrapper = mountLabel({}, { default: 'Slot Label' });
      expect(wrapper.text()).toContain('Slot Label');
    });

    it('should prefer text prop over slot', () => {
      const wrapper = mountLabel({ text: 'Text Prop' }, { default: 'Slot Content' });
      expect(wrapper.text()).toContain('Text Prop');
      expect(wrapper.text()).not.toContain('Slot Content');
    });

    it('should render as a <label> element', () => {
      const wrapper = mountLabel();
      expect(wrapper.element.tagName).toBe('LABEL');
    });
  });

  describe('sizes', () => {
    it('should apply xs size class', () => {
      const wrapper = mountLabel({ size: 'xs' });
      expect(wrapper.find('.coar-label--xs').exists()).toBe(true);
    });

    it('should apply s size class', () => {
      const wrapper = mountLabel({ size: 's' });
      expect(wrapper.find('.coar-label--s').exists()).toBe(true);
    });

    it('should apply m size class by default', () => {
      const wrapper = mountLabel();
      expect(wrapper.find('.coar-label--m').exists()).toBe(true);
    });

    it('should apply l size class', () => {
      const wrapper = mountLabel({ size: 'l' });
      expect(wrapper.find('.coar-label--l').exists()).toBe(true);
    });

    it('should only have one size class at a time', () => {
      const wrapper = mountLabel({ size: 'l' });
      const classes = wrapper.find('.coar-label').classes();
      const sizeClasses = classes.filter((c) => c.startsWith('coar-label--'));
      expect(sizeClasses).toEqual(['coar-label--l']);
    });
  });

  describe('required indicator', () => {
    it('should not show required indicator by default', () => {
      const wrapper = mountLabel();
      expect(wrapper.find('.coar-label-required').exists()).toBe(false);
    });

    it('should show required indicator when required is true', () => {
      const wrapper = mountLabel({ required: true });
      const required = wrapper.find('.coar-label-required');
      expect(required.exists()).toBe(true);
      expect(required.text()).toBe('*');
    });

    it('should hide required indicator from screen readers', () => {
      const wrapper = mountLabel({ required: true });
      const required = wrapper.find('.coar-label-required');
      expect(required.attributes('aria-hidden')).toBe('true');
    });
  });

  describe('for attribute', () => {
    it('should not have for attribute by default', () => {
      const wrapper = mountLabel();
      expect(wrapper.attributes('for')).toBeUndefined();
    });

    it('should set for attribute when provided', () => {
      const wrapper = mountLabel({ for: 'my-input' });
      expect(wrapper.attributes('for')).toBe('my-input');
    });

    it('should update for attribute dynamically', async () => {
      const wrapper = mountLabel({ for: 'first-input' });
      expect(wrapper.attributes('for')).toBe('first-input');

      await wrapper.setProps({ for: 'second-input' });
      expect(wrapper.attributes('for')).toBe('second-input');
    });
  });

  describe('content updates', () => {
    it('should update when text prop changes', async () => {
      const wrapper = mountLabel({ text: 'Test Label' });
      expect(wrapper.text()).toContain('Test Label');

      await wrapper.setProps({ text: 'Updated Label' });
      expect(wrapper.text()).toContain('Updated Label');
    });

    it('should handle empty text', () => {
      const wrapper = mountLabel({ text: '' });
      expect(wrapper.find('.coar-label-required').exists()).toBe(false);
    });
  });

  describe('default values', () => {
    it('should have default size of m', () => {
      const wrapper = mountLabel();
      expect(wrapper.find('.coar-label--m').exists()).toBe(true);
    });

    it('should have default required of false', () => {
      const wrapper = mountLabel();
      expect(wrapper.find('.coar-label-required').exists()).toBe(false);
    });
  });
});
