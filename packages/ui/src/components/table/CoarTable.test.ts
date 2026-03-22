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

  describe('root element structure', () => {
    it('should have no wrapper div — table is the root element', () => {
      const wrapper = mountTable();
      // The root element must be the <table> itself, not a wrapper <div>
      expect(wrapper.element.tagName).toBe('TABLE');
      expect(wrapper.element.children[0]?.tagName).not.toBe('TABLE');
    });

    it('should have display: table in scoped styles', () => {
      const wrapper = mountTable();
      // The .coar-table class sets display: table; verify the element itself is the table
      expect(wrapper.element.tagName).toBe('TABLE');
      expect(wrapper.classes()).toContain('coar-table');
    });

    it('should apply variant classes directly on the table element', () => {
      const wrapper = mountTable({ variant: 'bordered' });
      const table = wrapper.element;
      expect(table.tagName).toBe('TABLE');
      expect(wrapper.classes()).toContain('coar-table');
      expect(wrapper.classes()).toContain('coar-table--bordered');
    });

    it('should apply all modifier classes directly on the table element', () => {
      const wrapper = mountTable({ variant: 'plain', compact: true, hover: true });
      const classes = wrapper.classes();
      expect(wrapper.element.tagName).toBe('TABLE');
      expect(classes).toContain('coar-table');
      expect(classes).toContain('coar-table--plain');
      expect(classes).toContain('coar-table--compact');
      expect(classes).toContain('coar-table--hover');
    });
  });

  describe('slot content rendering', () => {
    it('should render thead with header cells', () => {
      const wrapper = mountTable();
      const ths = wrapper.findAll('thead th');
      expect(ths).toHaveLength(2);
      expect(ths[0].text()).toBe('Name');
      expect(ths[1].text()).toBe('Age');
    });

    it('should render tbody with data rows', () => {
      const wrapper = mountTable();
      const rows = wrapper.findAll('tbody tr');
      expect(rows).toHaveLength(3);
    });

    it('should render tbody cell content correctly', () => {
      const wrapper = mountTable();
      const cells = wrapper.findAll('tbody td');
      expect(cells[0].text()).toBe('Alice');
      expect(cells[1].text()).toBe('30');
      expect(cells[2].text()).toBe('Bob');
      expect(cells[3].text()).toBe('25');
      expect(cells[4].text()).toBe('Carol');
      expect(cells[5].text()).toBe('35');
    });

    it('should render a single-row table', () => {
      const single = '<tbody><tr><td>Only</td></tr></tbody>';
      const wrapper = mountTable({}, single);
      expect(wrapper.findAll('tbody tr')).toHaveLength(1);
      expect(wrapper.find('td').text()).toBe('Only');
    });

    it('should render an empty table without errors', () => {
      const wrapper = mountTable({}, '');
      expect(wrapper.element.tagName).toBe('TABLE');
      expect(wrapper.find('tbody').exists()).toBe(false);
    });

    it('should render tfoot slot content', () => {
      const withFoot = `
        <thead><tr><th>Item</th></tr></thead>
        <tbody><tr><td>Row</td></tr></tbody>
        <tfoot><tr><td>Total</td></tr></tfoot>
      `;
      const wrapper = mountTable({}, withFoot);
      expect(wrapper.find('tfoot').exists()).toBe(true);
      expect(wrapper.find('tfoot td').text()).toBe('Total');
    });
  });

  describe('dynamic updates', () => {
    it('should update variant class', async () => {
      const wrapper = mountTable({ variant: 'default' });
      expect(wrapper.find('.coar-table--plain').exists()).toBe(false);

      await wrapper.setProps({ variant: 'plain' });
      expect(wrapper.find('.coar-table--plain').exists()).toBe(true);
    });

    it('should toggle compact class', async () => {
      const wrapper = mountTable({ compact: false });
      expect(wrapper.classes()).not.toContain('coar-table--compact');

      await wrapper.setProps({ compact: true });
      expect(wrapper.classes()).toContain('coar-table--compact');
    });

    it('should toggle hover class', async () => {
      const wrapper = mountTable({ hover: true });
      expect(wrapper.classes()).toContain('coar-table--hover');

      await wrapper.setProps({ hover: false });
      expect(wrapper.classes()).not.toContain('coar-table--hover');
    });

    it('should switch between variants', async () => {
      const wrapper = mountTable({ variant: 'plain' });
      expect(wrapper.classes()).toContain('coar-table--plain');
      expect(wrapper.classes()).not.toContain('coar-table--bordered');

      await wrapper.setProps({ variant: 'bordered' });
      expect(wrapper.classes()).not.toContain('coar-table--plain');
      expect(wrapper.classes()).toContain('coar-table--bordered');

      await wrapper.setProps({ variant: 'default' });
      expect(wrapper.classes()).not.toContain('coar-table--plain');
      expect(wrapper.classes()).not.toContain('coar-table--bordered');
    });
  });
});
