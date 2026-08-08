import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import CoarYearView from '../CoarYearView.vue';
import { CalendarBuilder } from '../../builders/calendar-builder';
import { Temporal } from '../../core';

describe('<CoarYearView>', () => {
  it('renders twelve navigable months and drills into month view', async () => {
    const builder = CalendarBuilder.create()
      .date(Temporal.PlainDate.from('2026-08-17'))
      .timezone('Europe/Vienna')
      .locale('de-AT')
      .firstDayOfWeek(1)
      .availableViews(['year', 'month']);
    const wrapper = mount(CoarYearView, { props: { builder } });
    expect(wrapper.findAll('.coar-year-view__month')).toHaveLength(12);
    await wrapper.findAll('.coar-year-view__month-title')[1].trigger('click');
    await nextTick();
    expect(builder.state.view.value).toBe('month');
    expect(builder.state.date.value.toString()).toBe('2026-02-01');
    wrapper.unmount();
  });
});
