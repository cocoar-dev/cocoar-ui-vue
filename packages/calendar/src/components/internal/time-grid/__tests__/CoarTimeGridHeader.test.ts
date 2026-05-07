/**
 * Tests for `<CoarTimeGridHeader>` (internal/time-grid).
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import CoarTimeGridHeader from '../CoarTimeGridHeader.vue';
import { Temporal } from '../../../../core';

const days = [
  Temporal.PlainDate.from('2026-04-12'),
  Temporal.PlainDate.from('2026-04-13'),
  Temporal.PlainDate.from('2026-04-14'),
];

const baseProps = {
  days,
  isToday: (d: Temporal.PlainDate) => d.toString() === '2026-04-13',
  isWeekend: (d: Temporal.PlainDate) =>
    d.dayOfWeek === 6 || d.dayOfWeek === 7,
  formatLabel: (d: Temporal.PlainDate) => d.toString(),
};

describe('<CoarTimeGridHeader>', () => {
  it('renders one cell per day with the formatted label', () => {
    const wrapper = mount(CoarTimeGridHeader, { props: baseProps });
    const cells = wrapper.findAll('.coar-time-grid-header__cell');
    expect(cells).toHaveLength(3);
    expect(cells[0].text()).toBe('2026-04-12');
    expect(cells[2].text()).toBe('2026-04-14');
  });

  it('applies --today / --weekend classes', () => {
    const wrapper = mount(CoarTimeGridHeader, { props: baseProps });
    const cells = wrapper.findAll('.coar-time-grid-header__cell');
    expect(cells[0].classes()).toContain('coar-time-grid-header__cell--weekend');
    expect(cells[1].classes()).toContain('coar-time-grid-header__cell--today');
  });

  it('renders an empty corner cell over the hour axis', () => {
    const wrapper = mount(CoarTimeGridHeader, { props: baseProps });
    expect(wrapper.find('.coar-time-grid-header__corner').exists()).toBe(true);
  });

  it('forwards a custom dayHeader slot', () => {
    const Renderer = defineComponent({
      components: { CoarTimeGridHeader },
      setup() {
        return () =>
          h(CoarTimeGridHeader, baseProps, {
            dayHeader: ({ date }: { date: Temporal.PlainDate }) =>
              h('span', { class: 'custom' }, `★${date.day}`),
          });
      },
    });
    const wrapper = mount(Renderer);
    const customs = wrapper.findAll('.custom');
    expect(customs.map((c) => c.text())).toEqual(['★12', '★13', '★14']);
  });

  it('applies --density-compact when density is compact', () => {
    const wrapper = mount(CoarTimeGridHeader, {
      props: { ...baseProps, density: 'compact' },
    });
    expect(wrapper.find('.coar-time-grid-header').classes()).toContain(
      'coar-time-grid-header--density-compact',
    );
  });
});
