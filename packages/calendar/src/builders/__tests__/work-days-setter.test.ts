/**
 * `builder.workDays(...)` setter — surface contract.
 *
 * Reactive behavior (re-render when the source ref mutates) is
 * exercised by the playground demo + browser test; this suite
 * pins the type contract + default value + reactivity through
 * `toValue()`.
 */

import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { toValue } from 'vue';
import { useCalendar } from '../../useCalendar';
import type { DayOfWeek } from '../../core';

describe('builder.workDays()', () => {
  it('defaults to Mon–Fri', () => {
    const { builder } = useCalendar();
    expect(toValue(builder.state.workDays)).toEqual([1, 2, 3, 4, 5]);
  });

  it('accepts a plain array', () => {
    const { builder } = useCalendar();
    builder.workDays([1, 2, 3, 4, 5, 6]);
    expect(toValue(builder.state.workDays)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('accepts a ref and tracks mutations', () => {
    const { builder } = useCalendar();
    const days = ref<DayOfWeek[]>([1, 2, 3, 4]);
    builder.workDays(days);
    expect(toValue(builder.state.workDays)).toEqual([1, 2, 3, 4]);
    days.value = [0, 1, 2, 3, 4];
    expect(toValue(builder.state.workDays)).toEqual([0, 1, 2, 3, 4]);
  });

  it('accepts a getter', () => {
    const { builder } = useCalendar();
    let flag = true;
    builder.workDays(() => (flag ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]));
    expect(toValue(builder.state.workDays)).toEqual([1, 2, 3, 4, 5]);
    flag = false;
    expect(toValue(builder.state.workDays)).toEqual([1, 2, 3, 4]);
  });

  it('accepts an empty array (caller responsibility for UX)', () => {
    const { builder } = useCalendar();
    builder.workDays([]);
    expect(toValue(builder.state.workDays)).toEqual([]);
  });

  it('chains', () => {
    const { builder } = useCalendar();
    const result = builder
      .timezone('Europe/Vienna')
      .workDays([1, 2, 3, 4, 5])
      .firstDayOfWeek(1);
    expect(result).toBe(builder);
  });
});
