/**
 * Tests for `<CoarMonthRow>` (internal/month).
 *
 * Scope: inline height, density class, slot render. Layout math
 * lives in `core/monthGridLayout`.
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import CoarMonthRow from '../CoarMonthRow.vue';

describe('<CoarMonthRow>', () => {
  it('sets height inline from heightPx', () => {
    const wrapper = mount(CoarMonthRow, {
      props: { heightPx: 145 },
      slots: { default: '<div class="x" />' },
    });
    const style = wrapper.find('.coar-month-row').attributes('style') ?? '';
    expect(style).toContain('height: 145px');
  });

  it('renders slot content inside the row', () => {
    const Renderer = defineComponent({
      components: { CoarMonthRow },
      setup() {
        return () =>
          h(CoarMonthRow, { heightPx: 100 }, () =>
            h('div', { class: 'cell' }, 'A'),
          );
      },
    });
    const wrapper = mount(Renderer);
    expect(wrapper.find('.coar-month-row .cell').text()).toBe('A');
  });

  it('does not apply density-compact class by default', () => {
    const wrapper = mount(CoarMonthRow, {
      props: { heightPx: 100 },
      slots: { default: '<div />' },
    });
    expect(wrapper.find('.coar-month-row').classes()).not.toContain(
      'coar-month-row--density-compact',
    );
  });

  it('applies density-compact class when density prop is compact', () => {
    const wrapper = mount(CoarMonthRow, {
      props: { heightPx: 100, density: 'compact' },
      slots: { default: '<div />' },
    });
    expect(wrapper.find('.coar-month-row').classes()).toContain(
      'coar-month-row--density-compact',
    );
  });
});
