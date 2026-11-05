/**
 * Builder surface of the time-grid selection features: `timeRangeSelect`,
 * `hoverIndicator`, `selectionPolicy`, `onTimeRangeSelect`, `draft` and
 * `backgrounds`.
 *
 * Pins: the defaults (everything off / empty), Ref and getter sources
 * for the reactive knobs, functions stored verbatim (C7), chaining.
 */

import { describe, expect, it } from 'vitest';
import { ref, toValue } from 'vue';
import { useCalendar } from '../../useCalendar';
import { Temporal, gapOrDurationPolicy } from '../../core';
import type { BackgroundsFn, CalendarDraft, TimeRangeSelectHandler } from '../types';

const zone = 'Europe/Vienna';
const at = (iso: string) => Temporal.ZonedDateTime.from(`${iso}[${zone}]`);

describe('time selection builder surface', () => {
  it('defaults: selection and hover off, no policy, no draft, no bands, no hook', () => {
    const { builder } = useCalendar();
    const s = builder.state;
    expect(toValue(s.timeRangeSelect)).toBe(false);
    expect(toValue(s.hoverIndicator)).toBe(false);
    expect(toValue(s.draft)).toBeNull();
    expect(s.selectionPolicy).toBeNull();
    expect(s.backgrounds).toBeNull();
    expect(s.onTimeRangeSelect).toBeNull();
  });

  it('timeRangeSelect / hoverIndicator: no argument means on; Ref and getter sources', () => {
    const { builder } = useCalendar();
    builder.timeRangeSelect().hoverIndicator();
    expect(toValue(builder.state.timeRangeSelect)).toBe(true);
    expect(toValue(builder.state.hoverIndicator)).toBe(true);

    const on = ref(false);
    builder.timeRangeSelect(on).hoverIndicator(() => on.value);
    expect(toValue(builder.state.timeRangeSelect)).toBe(false);
    expect(toValue(builder.state.hoverIndicator)).toBe(false);
    on.value = true;
    expect(toValue(builder.state.timeRangeSelect)).toBe(true);
    expect(toValue(builder.state.hoverIndicator)).toBe(true);
  });

  it('draft follows a Ref; null hides it', () => {
    const { builder } = useCalendar();
    const draft = ref<CalendarDraft | null>(null);
    builder.draft(draft);
    expect(toValue(builder.state.draft)).toBeNull();
    draft.value = { start: at('2026-04-15T12:00'), end: at('2026-04-15T14:15') };
    expect(toValue(builder.state.draft)?.end.toString()).toContain('14:15');
    builder.draft(() => null);
    expect(toValue(builder.state.draft)).toBeNull();
  });

  it('stores the policy, the bands function and the hook verbatim', () => {
    const { builder } = useCalendar();
    const policy = gapOrDurationPolicy({ minutes: 60 });
    const bands: BackgroundsFn = () => [];
    const hook: TimeRangeSelectHandler = () => {};
    builder.selectionPolicy(policy).backgrounds(bands).onTimeRangeSelect(hook);
    expect(builder.state.selectionPolicy).toBe(policy);
    expect(builder.state.backgrounds).toBe(bands);
    expect(builder.state.onTimeRangeSelect).toBe(hook);
  });

  it('every setter chains', () => {
    const { builder } = useCalendar();
    expect(
      builder
        .timeRangeSelect(true)
        .hoverIndicator(true)
        .selectionPolicy(gapOrDurationPolicy({ minutes: 30 }))
        .draft(null)
        .backgrounds(() => null)
        .onTimeRangeSelect(() => {}),
    ).toBe(builder);
  });
});
