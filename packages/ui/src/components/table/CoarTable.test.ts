import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarTable from './CoarTable.vue';

const sampleTable = `
  <thead><tr><th>Name</th><th>Age</th></tr></thead>
  <tbody>
    <tr><td>Alice</td><td>30</td></tr>
    <tr><td>Bob</td><td>25</td></tr>
    <tr><td>Carol</td><td>35</td></tr>
  </tbody>
`;

function mountTable(props: Record<string, unknown> = {}, slotContent = sampleTable) {
  return mount(CoarTable, { props, slots: { default: slotContent } });
}

describe('CoarTable', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountTable();
      expect(wrapper.find('.coar-table').exists()).toBe(true);
    });

    it('should render as a table element', () => {
      const wrapper = mountTable();
      expect(wrapper.element.tagName).toBe('TABLE');
    });

    it('should render slot content', () => {
      const wrapper = mountTable();
      expect(wrapper.find('thead').exists()).toBe(true);
      expect(wrapper.find('tbody').exists()).toBe(true);
      expect(wrapper.findAll('th').length).toBe(2);
      expect(wrapper.findAll('td').length).toBe(6);
    });
  });

  describe('defaults', () => {
    it('should use default variant (no plain/bordered classes)', () => {
      const wrapper = mountTable();
      expect(wrapper.find('.coar-table--plain').exists()).toBe(false);
      expect(wrapper.find('.coar-table--bordered').exists()).toBe(false);
    });

    it('should have hover enabled by default', () => {
      const wrapper = mountTable();
      expect(wrapper.find('.coar-table--hover').exists()).toBe(true);
    });

    it('should not be compact by default', () => {
      const wrapper = mountTable();
      expect(wrapper.find('.coar-table--compact').exists()).toBe(false);
    });
  });

  describe('variants', () => {
    it('should apply plain variant class', () => {
      const wrapper = mountTable({ variant: 'plain' });
      expect(wrapper.find('.coar-table--plain').exists()).toBe(true);
    });

    it('should apply bordered variant class', () => {
      const wrapper = mountTable({ variant: 'bordered' });
      expect(wrapper.find('.coar-table--bordered').exists()).toBe(true);
    });

    it('should not apply variant class for default', () => {
      const wrapper = mountTable({ variant: 'default' });
      expect(wrapper.find('.coar-table--plain').exists()).toBe(false);
      expect(wrapper.find('.coar-table--bordered').exists()).toBe(false);
    });
  });

  describe('compact', () => {
    it('should apply compact class', () => {
      const wrapper = mountTable({ compact: true });
      expect(wrapper.find('.coar-table--compact').exists()).toBe(true);
    });
  });

  describe('hover', () => {
    it('should apply hover class by default', () => {
      const wrapper = mountTable();
      expect(wrapper.find('.coar-table--hover').exists()).toBe(true);
    });

    it('should remove hover class when disabled', () => {
      const wrapper = mountTable({ hover: false });
      expect(wrapper.find('.coar-table--hover').exists()).toBe(false);
    });
  });

  describe('dynamic updates', () => {
    it('should update variant class', async () => {
      const wrapper = mountTable({ variant: 'default' });
      expect(wrapper.find('.coar-table--plain').exists()).toBe(false);

      await wrapper.setProps({ variant: 'plain' });
      expect(wrapper.find('.coar-table--plain').exists()).toBe(true);
    });
  });
});
