import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarCard from './CoarCard.vue';

function mountCard(props: Record<string, unknown> = {}, slots?: Record<string, string>) {
  return mount(CoarCard, { props, slots });
}

describe('CoarCard', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountCard();
      expect(wrapper.find('.coar-card').exists()).toBe(true);
    });

    it('should render default slot content', () => {
      const wrapper = mountCard({}, { default: '<p>Card body</p>' });
      expect(wrapper.text()).toContain('Card body');
    });

    it('should render header slot', () => {
      const wrapper = mountCard({}, { header: '<h3>Title</h3>' });
      expect(wrapper.find('.coar-card__header').exists()).toBe(true);
      expect(wrapper.text()).toContain('Title');
    });

    it('should render footer slot', () => {
      const wrapper = mountCard({}, { footer: '<button>Save</button>' });
      expect(wrapper.find('.coar-card__footer').exists()).toBe(true);
      expect(wrapper.text()).toContain('Save');
    });

    it('should render inset slot', () => {
      const wrapper = mountCard({}, { inset: '<img />' });
      expect(wrapper.find('.coar-card__inset').exists()).toBe(true);
    });

    it('should not render header wrapper when slot is empty', () => {
      const wrapper = mountCard();
      expect(wrapper.find('.coar-card__header').exists()).toBe(false);
    });

    it('should not render footer wrapper when slot is empty', () => {
      const wrapper = mountCard();
      expect(wrapper.find('.coar-card__footer').exists()).toBe(false);
    });
  });

  describe('defaults', () => {
    it('should have neutral variant by default', () => {
      const wrapper = mountCard();
      expect(wrapper.find('.coar-card--neutral').exists()).toBe(true);
    });

    it('should have m padding by default', () => {
      const wrapper = mountCard();
      expect(wrapper.find('.coar-card--padding-m').exists()).toBe(true);
    });

    it('should not be elevated by default', () => {
      const wrapper = mountCard();
      expect(wrapper.find('.coar-card--elevated').exists()).toBe(false);
    });

    it('should not be borderless by default', () => {
      const wrapper = mountCard();
      expect(wrapper.find('.coar-card--borderless').exists()).toBe(false);
    });
  });

  describe('variants', () => {
    it.each(['neutral', 'outlined', 'success', 'warning', 'error', 'info', 'accent'] as const)(
      'should apply %s variant class',
      (variant) => {
        const wrapper = mountCard({ variant });
        expect(wrapper.find(`.coar-card--${variant}`).exists()).toBe(true);
      },
    );
  });

  describe('padding', () => {
    it.each(['none', 's', 'm', 'l'] as const)('should apply %s padding class', (padding) => {
      const wrapper = mountCard({ padding });
      expect(wrapper.find(`.coar-card--padding-${padding}`).exists()).toBe(true);
    });
  });

  describe('elevated', () => {
    it('should apply elevated class', () => {
      const wrapper = mountCard({ elevated: true });
      expect(wrapper.find('.coar-card--elevated').exists()).toBe(true);
    });
  });

  describe('borderless', () => {
    it('should apply borderless class', () => {
      const wrapper = mountCard({ borderless: true });
      expect(wrapper.find('.coar-card--borderless').exists()).toBe(true);
    });
  });

  describe('dynamic updates', () => {
    it('should update variant class', async () => {
      const wrapper = mountCard({ variant: 'neutral' });
      expect(wrapper.find('.coar-card--neutral').exists()).toBe(true);

      await wrapper.setProps({ variant: 'success' });
      expect(wrapper.find('.coar-card--success').exists()).toBe(true);
      expect(wrapper.find('.coar-card--neutral').exists()).toBe(false);
    });
  });
});
