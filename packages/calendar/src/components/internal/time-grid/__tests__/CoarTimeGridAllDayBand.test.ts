/**
 * Tests for `<CoarTimeGridAllDayBand>` (internal/time-grid).
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import CoarTimeGridAllDayBand from '../CoarTimeGridAllDayBand.vue';
import { Temporal } from '../../../../core';

const days = [
  Temporal.PlainDate.from('2026-04-12'),
  Temporal.PlainDate.from('2026-04-13'),
  Temporal.PlainDate.from('2026-04-14'),
];

const baseProps = {
  days,
  axisLabel: 'all-day',
  bandHeightPx: 32,
  isToday: (d: Temporal.PlainDate) => d.toString() === '2026-04-13',
  isWeekend: (d: Temporal.PlainDate) =>
    d.dayOfWeek === 6 || d.dayOfWeek === 7,
  setColumnsEl: () => {},
};

describe('<CoarTimeGridAllDayBand>', () => {
  it('renders the axis label + one cell per day', () => {
    const wrapper = mount(CoarTimeGridAllDayBand, { props: baseProps });
    expect(wrapper.find('.coar-time-grid-all-day-band__axis').text()).toBe('all-day');
    expect(wrapper.findAll('.coar-time-grid-all-day-band__cell')).toHaveLength(3);
  });

  it('sets band min-height inline', () => {
    const wrapper = mount(CoarTimeGridAllDayBand, {
      props: { ...baseProps, bandHeightPx: 60 },
    });
    const style = wrapper.find('.coar-time-grid-all-day-band').attributes('style') ?? '';
    expect(style).toContain('min-height: 60px');
  });

  it('applies --today / --weekend cell classes', () => {
    const wrapper = mount(CoarTimeGridAllDayBand, { props: baseProps });
    const cells = wrapper.findAll('.coar-time-grid-all-day-band__cell');
    expect(cells[0].classes()).toContain('coar-time-grid-all-day-band__cell--weekend');
    expect(cells[1].classes()).toContain('coar-time-grid-all-day-band__cell--today');
  });

  it('emits cellPointerdown(native, day)', async () => {
    const wrapper = mount(CoarTimeGridAllDayBand, { props: baseProps });
    await wrapper.findAll('.coar-time-grid-all-day-band__cell')[1].trigger('pointerdown');
    const ev = wrapper.emitted('cellPointerdown');
    expect(ev).toHaveLength(1);
    expect((ev![0][1] as Temporal.PlainDate).toString()).toBe('2026-04-13');
  });

  it('forwards setColumnsEl on mount + null on unmount', async () => {
    const captured = ref<HTMLElement | null>(null);
    const wrapper = mount(CoarTimeGridAllDayBand, {
      props: {
        ...baseProps,
        setColumnsEl: (el) => {
          captured.value = el;
        },
      },
      attachTo: document.body,
    });
    await nextTick();
    expect(captured.value).toBeInstanceOf(HTMLElement);
    expect(captured.value?.classList.contains('coar-time-grid-all-day-band__columns')).toBe(true);
    wrapper.unmount();
    await nextTick();
    expect(captured.value).toBeNull();
  });

  it('renders default-slot content (bars / overlays) inside the columns container', () => {
    const Renderer = defineComponent({
      components: { CoarTimeGridAllDayBand },
      setup() {
        return () =>
          h(CoarTimeGridAllDayBand, baseProps, () =>
            h('div', { class: 'fake-bar' }, 'bar'),
          );
      },
    });
    const wrapper = mount(Renderer);
    const cols = wrapper.find('.coar-time-grid-all-day-band__columns');
    expect(cols.find('.fake-bar').exists()).toBe(true);
  });
});
