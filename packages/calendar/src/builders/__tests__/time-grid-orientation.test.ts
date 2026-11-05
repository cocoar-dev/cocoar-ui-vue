/**
 * `builder.timeGridOrientation(...)` + `api.setTimeGridOrientation`
 * — surface contract of the presentation knob behind the horizontal
 * (days-as-rows) time grid.
 *
 * Pins: default `'vertical'`; plain value / Ref / getter sources;
 * the api writes a Ref through (two-way), replaces a plain value and
 * dev-warns on a getter — the same rules as `setDayMode`. The knob
 * never touches the view, cursor or window.
 */

import { describe, expect, it, vi } from 'vitest';
import { ref, toValue } from 'vue';
import { useCalendar } from '../../useCalendar';
import type { CalendarTimeGridOrientation } from '../../core';

describe('builder.timeGridOrientation()', () => {
  it("defaults to 'vertical'", () => {
    const { builder } = useCalendar();
    expect(toValue(builder.state.timeGridOrientation)).toBe('vertical');
  });

  it('accepts a plain value, a Ref and a getter', () => {
    const { builder } = useCalendar();
    builder.timeGridOrientation('horizontal');
    expect(toValue(builder.state.timeGridOrientation)).toBe('horizontal');

    const o = ref<CalendarTimeGridOrientation>('vertical');
    builder.timeGridOrientation(o);
    expect(toValue(builder.state.timeGridOrientation)).toBe('vertical');
    o.value = 'horizontal';
    expect(toValue(builder.state.timeGridOrientation)).toBe('horizontal');

    let flag = false;
    builder.timeGridOrientation(() => (flag ? 'horizontal' : 'vertical'));
    expect(toValue(builder.state.timeGridOrientation)).toBe('vertical');
    flag = true;
    expect(toValue(builder.state.timeGridOrientation)).toBe('horizontal');
  });

  it('is chainable', () => {
    const { builder } = useCalendar();
    expect(builder.timeGridOrientation('horizontal')).toBe(builder);
  });
});

describe('api.setTimeGridOrientation()', () => {
  it('writes a bound Ref through', () => {
    const { builder, api } = useCalendar();
    const o = ref<CalendarTimeGridOrientation>('vertical');
    builder.timeGridOrientation(o);
    api.setTimeGridOrientation('horizontal');
    expect(o.value).toBe('horizontal');
  });

  it('replaces a plain value', () => {
    const { builder, api } = useCalendar();
    api.setTimeGridOrientation('horizontal');
    expect(toValue(builder.state.timeGridOrientation)).toBe('horizontal');
  });

  it('dev-warns and leaves a getter alone', () => {
    const { builder, api } = useCalendar();
    builder.timeGridOrientation(() => 'vertical');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.setTimeGridOrientation('horizontal');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('setTimeGridOrientation'));
    expect(toValue(builder.state.timeGridOrientation)).toBe('vertical');
    warn.mockRestore();
  });

  it('does not touch the view or the cursor', () => {
    const { builder, api } = useCalendar();
    builder.view('week');
    const before = builder.state.date.value.toString();
    api.setTimeGridOrientation('horizontal');
    expect(builder.state.view.value).toBe('week');
    expect(builder.state.date.value.toString()).toBe(before);
  });
});
