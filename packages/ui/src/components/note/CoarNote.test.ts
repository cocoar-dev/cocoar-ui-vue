import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarNote from './CoarNote.vue';

function mountNote(props: Record<string, unknown> = {}, slots?: Record<string, string>) {
  return mount(CoarNote, { props, slots });
}

describe('CoarNote', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountNote();
      expect(wrapper.find('.coar-note').exists()).toBe(true);
    });

    it('should render slot content', () => {
      const wrapper = mountNote({}, { default: '<p>Important info</p>' });
      expect(wrapper.text()).toContain('Important info');
    });

    it('should render as a div element', () => {
      const wrapper = mountNote();
      expect(wrapper.element.tagName).toBe('DIV');
    });
  });

  describe('defaults', () => {
    it('should have neutral variant by default', () => {
      const wrapper = mountNote();
      expect(wrapper.find('.coar-note--neutral').exists()).toBe(true);
    });

    it('should have m padding by default', () => {
      const wrapper = mountNote();
      expect(wrapper.find('.coar-note--padding-m').exists()).toBe(true);
    });
  });

  describe('variants', () => {
    it.each(['neutral', 'success', 'warning', 'error', 'info', 'accent'] as const)(
      'should apply %s variant class',
      (variant) => {
        const wrapper = mountNote({ variant });
        expect(wrapper.find(`.coar-note--${variant}`).exists()).toBe(true);
      },
    );

    it('should only have one variant class at a time', () => {
      const wrapper = mountNote({ variant: 'warning' });
      const classes = wrapper.find('.coar-note').classes();
      const variantClasses = classes.filter(
        (c) => c.startsWith('coar-note--') && !c.startsWith('coar-note--padding'),
      );
      expect(variantClasses).toEqual(['coar-note--warning']);
    });
  });

  describe('padding', () => {
    it.each(['s', 'm', 'l'] as const)('should apply %s padding class', (padding) => {
      const wrapper = mountNote({ padding });
      expect(wrapper.find(`.coar-note--padding-${padding}`).exists()).toBe(true);
    });
  });

  describe('dynamic updates', () => {
    it('should update variant class', async () => {
      const wrapper = mountNote({ variant: 'info' });
      expect(wrapper.find('.coar-note--info').exists()).toBe(true);

      await wrapper.setProps({ variant: 'error' });
      expect(wrapper.find('.coar-note--error').exists()).toBe(true);
      expect(wrapper.find('.coar-note--info').exists()).toBe(false);
    });

    it('should update padding class', async () => {
      const wrapper = mountNote({ padding: 's' });
      expect(wrapper.find('.coar-note--padding-s').exists()).toBe(true);

      await wrapper.setProps({ padding: 'l' });
      expect(wrapper.find('.coar-note--padding-l').exists()).toBe(true);
      expect(wrapper.find('.coar-note--padding-s').exists()).toBe(false);
    });
  });
});
