/**
 * Tests for `<CoarMonthGrid>` (internal/month).
 *
 * Scope: weekday header rendering, slot render, setRowsEl
 * function-ref forwarding for the dnd hit-test surface.
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import CoarMonthGrid from '../CoarMonthGrid.vue';

describe('<CoarMonthGrid>', () => {
  const headers = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  it('renders all 7 weekday headers in order', () => {
    const wrapper = mount(CoarMonthGrid, {
      props: { weekdayHeaders: headers, setRowsEl: () => {} },
      slots: { default: '' },
    });
    const cells = wrapper.findAll('.coar-month-grid__weekday-cell');
    expect(cells).toHaveLength(7);
    expect(cells.map((c) => c.text())).toEqual(headers);
  });

  it('renders slot content inside the rows container', () => {
    const Renderer = defineComponent({
      components: { CoarMonthGrid },
      setup() {
        return () =>
          h(
            CoarMonthGrid,
            { weekdayHeaders: headers, setRowsEl: () => {} },
            () => h('div', { class: 'fake-row' }, 'row'),
          );
      },
    });
    const wrapper = mount(Renderer);
    const rows = wrapper.find('.coar-month-grid__rows');
    expect(rows.exists()).toBe(true);
    expect(rows.find('.fake-row').exists()).toBe(true);
  });

  it('calls setRowsEl with the rows-container element on mount', async () => {
    const captured = ref<HTMLElement | null>(null);
    const wrapper = mount(CoarMonthGrid, {
      props: {
        weekdayHeaders: headers,
        setRowsEl: (el) => {
          captured.value = el;
        },
      },
      slots: { default: '' },
      attachTo: document.body,
    });
    await nextTick();
    expect(captured.value).toBeInstanceOf(HTMLElement);
    expect(captured.value?.classList.contains('coar-month-grid__rows')).toBe(true);
    wrapper.unmount();
  });

  it('calls setRowsEl(null) on unmount', async () => {
    const captured = ref<HTMLElement | null>(null);
    const wrapper = mount(CoarMonthGrid, {
      props: {
        weekdayHeaders: headers,
        setRowsEl: (el) => {
          captured.value = el;
        },
      },
      slots: { default: '' },
      attachTo: document.body,
    });
    await nextTick();
    expect(captured.value).not.toBeNull();
    wrapper.unmount();
    await nextTick();
    expect(captured.value).toBeNull();
  });
});
