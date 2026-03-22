import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

/**
 * CoarLink is a CSS-only component — no .vue file, just CSS classes
 * applied to native <a> elements. These tests verify the correct
 * class names render and combine as expected.
 */

function mountLink(classes: string, attrs: Record<string, string> = {}) {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  return mount(
    defineComponent({
      template: `<a class="${classes}" href="#" ${attrStr}>Link text</a>`,
    }),
  );
}

describe('CoarLink (CSS-only)', () => {
  describe('base class', () => {
    it('should render with .coar-link class', () => {
      const wrapper = mountLink('coar-link');
      expect(wrapper.find('.coar-link').exists()).toBe(true);
    });

    it('should render as an anchor element', () => {
      const wrapper = mountLink('coar-link');
      expect(wrapper.element.tagName).toBe('A');
    });

    it('should contain the link text', () => {
      const wrapper = mountLink('coar-link');
      expect(wrapper.text()).toBe('Link text');
    });
  });

  describe('subtle variant', () => {
    it('should apply subtle modifier class', () => {
      const wrapper = mountLink('coar-link coar-link--subtle');
      expect(wrapper.classes()).toContain('coar-link');
      expect(wrapper.classes()).toContain('coar-link--subtle');
    });

    it('should still have the base .coar-link class', () => {
      const wrapper = mountLink('coar-link coar-link--subtle');
      expect(wrapper.find('.coar-link').exists()).toBe(true);
    });
  });

  describe('size variants', () => {
    it.each(['s', 'm', 'l'] as const)('should apply %s size class', (size) => {
      const wrapper = mountLink(`coar-link coar-link--${size}`);
      expect(wrapper.classes()).toContain(`coar-link--${size}`);
    });

    it('should combine size with base class', () => {
      const wrapper = mountLink('coar-link coar-link--l');
      expect(wrapper.classes()).toContain('coar-link');
      expect(wrapper.classes()).toContain('coar-link--l');
    });

    it('should combine size with subtle variant', () => {
      const wrapper = mountLink('coar-link coar-link--subtle coar-link--s');
      expect(wrapper.classes()).toContain('coar-link');
      expect(wrapper.classes()).toContain('coar-link--subtle');
      expect(wrapper.classes()).toContain('coar-link--s');
    });
  });

  describe('disabled state', () => {
    it('should apply disabled modifier class', () => {
      const wrapper = mountLink('coar-link coar-link--disabled');
      expect(wrapper.classes()).toContain('coar-link--disabled');
    });

    it('should support aria-disabled attribute', () => {
      const wrapper = mountLink('coar-link', { 'aria-disabled': 'true' });
      expect(wrapper.attributes('aria-disabled')).toBe('true');
    });

    it('should support both aria-disabled and disabled class together', () => {
      const wrapper = mountLink('coar-link coar-link--disabled', { 'aria-disabled': 'true' });
      expect(wrapper.classes()).toContain('coar-link--disabled');
      expect(wrapper.attributes('aria-disabled')).toBe('true');
    });
  });

  describe('class combinations', () => {
    it('should support all modifiers together', () => {
      const wrapper = mountLink('coar-link coar-link--subtle coar-link--l coar-link--disabled');
      const classes = wrapper.classes();
      expect(classes).toContain('coar-link');
      expect(classes).toContain('coar-link--subtle');
      expect(classes).toContain('coar-link--l');
      expect(classes).toContain('coar-link--disabled');
    });

    it('should have exactly the specified classes', () => {
      const wrapper = mountLink('coar-link coar-link--s');
      expect(wrapper.classes()).toEqual(['coar-link', 'coar-link--s']);
    });
  });
});
