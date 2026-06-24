import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TableSizePicker from './TableSizePicker.vue';

describe('TableSizePicker', () => {
  it('renders a max×max grid (default 8)', () => {
    const wrapper = mount(TableSizePicker, { props: { pick: vi.fn() } });
    expect(wrapper.findAll('.coar-md-table-picker__cell')).toHaveLength(64);
  });

  it('respects a custom max', () => {
    const wrapper = mount(TableSizePicker, { props: { pick: vi.fn(), max: 5 } });
    expect(wrapper.findAll('.coar-md-table-picker__cell')).toHaveLength(25);
  });

  it('shows the hovered dimension as "cols × rows"', async () => {
    const wrapper = mount(TableSizePicker, { props: { pick: vi.fn() } });
    // row-major: index = (row-1)*8 + (col-1). row 3, col 4 → index 19.
    await wrapper.findAll('.coar-md-table-picker__cell')[19]!.trigger('mouseover');
    expect(wrapper.find('.coar-md-table-picker__label').text()).toBe('4 × 3');
  });

  it('highlights the rectangle up to the hovered cell', async () => {
    const wrapper = mount(TableSizePicker, { props: { pick: vi.fn() } });
    await wrapper.findAll('.coar-md-table-picker__cell')[19]!.trigger('mouseover'); // 4×3
    expect(wrapper.findAll('.coar-md-table-picker__cell--on')).toHaveLength(12);
  });

  it('calls pick(rows, cols) on click', async () => {
    const pick = vi.fn();
    const wrapper = mount(TableSizePicker, { props: { pick } });
    await wrapper.findAll('.coar-md-table-picker__cell')[19]!.trigger('click'); // row 3, col 4
    expect(pick).toHaveBeenCalledWith(3, 4);
  });
});
