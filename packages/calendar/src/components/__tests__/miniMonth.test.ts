import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import CoarMiniMonth from '../CoarMiniMonth.vue';

const pd = (s: string) => Temporal.PlainDate.from(s);
const base = { locale: 'en-GB', firstDayOfWeek: 1 as const, timezone: 'Europe/Vienna' };

describe('CoarMiniMonth', () => {
  it('always shows six weeks and marks the selected day and its week', () => {
    const w = mount(CoarMiniMonth, { props: { ...base, modelValue: pd('2026-11-19') } });
    expect(w.findAll('.coar-mini-month__day')).toHaveLength(42);
    expect(w.find('.coar-mini-month__day--selected').attributes('data-day-key')).toBe('2026-11-19');
    expect(w.findAll('.coar-mini-month__day--week').map((d) => d.attributes('data-day-key'))).toEqual(
      ['16', '17', '18', '19', '20', '21', '22'].map((d) => `2026-11-${d}`),
    );
    expect(w.find('[data-day-key="2026-12-01"]').classes()).toContain('coar-mini-month__day--other');
  });

  it('emits the day that is clicked, also of a neighbouring month', async () => {
    const w = mount(CoarMiniMonth, { props: { ...base, modelValue: pd('2026-11-19') } });
    await w.find('[data-day-key="2026-12-01"]').trigger('click');
    expect(String(w.emitted('update:modelValue')![0][0])).toBe('2026-12-01');
  });

  it('leafs on its own, without changing the selection', async () => {
    const w = mount(CoarMiniMonth, { props: { ...base, modelValue: pd('2026-11-19') } });
    await w.findAll('.coar-mini-month__nav')[1].trigger('click');
    expect(w.find('.coar-mini-month__title').text()).toBe('December 2026');
    expect(w.emitted('update:modelValue')).toBeUndefined();
  });

  it('follows modelValue to another month', async () => {
    const w = mount(CoarMiniMonth, { props: { ...base, modelValue: pd('2026-11-19') } });
    await w.setProps({ modelValue: pd('2027-02-03') });
    expect(w.find('.coar-mini-month__title').text()).toBe('February 2027');
  });

  it('has one tab stop that the arrow keys move, across the month too', async () => {
    const w = mount(CoarMiniMonth, {
      props: { ...base, modelValue: pd('2026-11-30') },
      attachTo: document.body,
    });
    expect(w.findAll('[tabindex="0"]').filter((b) => b.classes('coar-mini-month__day'))).toHaveLength(1);
    await w.find('[data-day-key="2026-11-30"]').trigger('keydown', { key: 'ArrowDown' });
    await nextTick();
    expect(w.find('.coar-mini-month__title').text()).toBe('December 2026');
    expect(w.find('[data-day-key="2026-12-07"]').attributes('tabindex')).toBe('0');
    w.unmount();
  });

  it('renders custom day content', () => {
    const w = mount(CoarMiniMonth, {
      props: { ...base, modelValue: pd('2026-11-19') },
      slots: { day: `<template #day="{ date, isSelected }"><i :data-on="isSelected">{{ date.day }}</i></template>` },
    });
    expect(w.find('[data-day-key="2026-11-19"] i').attributes('data-on')).toBe('true');
  });

  it('lets the host format the title', () => {
    const w = mount(CoarMiniMonth, {
      props: { ...base, modelValue: pd('2026-11-19') },
      slots: { title: `<template #title="{ month, label }"><b class="t">{{ month.month }}|{{ label }}</b></template>` },
    });
    expect(w.find('.t').text()).toBe('11|November 2026');
  });

  it('stays silent without a selection', () => {
    vi.useFakeTimers({ now: new Date('2026-11-19T10:00:00Z') });
    const w = mount(CoarMiniMonth, { props: base });
    expect(w.find('.coar-mini-month__day--selected').exists()).toBe(false);
    expect(w.find('.coar-mini-month__day--today').attributes('data-day-key')).toBe('2026-11-19');
    vi.useRealTimers();
  });
});
