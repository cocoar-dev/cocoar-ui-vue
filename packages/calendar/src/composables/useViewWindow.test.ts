/**
 * `useViewWindow` — single-writer + reactive-recompute tests.
 *
 * Pins the C5 invariant: ONE writer for `_visibleRange`. Verifies:
 *
 *   1. Mounting the composable populates `_visibleRange` immediately.
 *   2. Mutating any input (view, date, timezone, firstDayOfWeek,
 *      agendaLengthDays) recomputes and writes a new window.
 *   3. Identical-shape windows are deduped by the builder's
 *      `windowsEqual` check (no duplicate `onRangeChange` fires).
 *   4. A second `useViewWindow` against the same builder dev-warns.
 *   5. Disposing the scope cleans up the warn-tracking set so a
 *      LATER mount doesn't get a false warn.
 */

import { describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../builders/calendar-builder';
import { useViewWindow } from './useViewWindow';

const newBuilder = () =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .view('month')
    .date(Temporal.PlainDate.from('2026-06-15'));

describe('useViewWindow — basic contract', () => {
  it('populates visibleRange immediately on mount', () => {
    const b = newBuilder();
    const scope = effectScope();
    scope.run(() => {
      const { visibleRange } = useViewWindow(b);
      expect(visibleRange.value).not.toBeNull();
      expect(visibleRange.value?.view).toBe('month');
      expect(visibleRange.value?.timezone).toBe('Europe/Vienna');
    });
    scope.stop();
  });

  it('recomputes when state.view changes', async () => {
    const b = newBuilder();
    const handler = vi.fn();
    b.onRangeChange(handler);
    const scope = effectScope();
    scope.run(() => {
      useViewWindow(b);
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].view).toBe('month');

    b.api.setView('week');
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[1][0].view).toBe('week');

    scope.stop();
  });

  it('recomputes when state.date changes (api.next)', async () => {
    const b = newBuilder().view('week');
    const handler = vi.fn();
    b.onRangeChange(handler);
    const scope = effectScope();
    scope.run(() => {
      useViewWindow(b);
    });
    const initial = handler.mock.calls[0][0].start;
    b.api.next();
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[1][0].start).not.toBe(initial);
    scope.stop();
  });

  it('recomputes when state.timezone changes (cache key includes tz)', async () => {
    const b = newBuilder();
    const tz = ref('Europe/Vienna');
    b.timezone(tz);
    const handler = vi.fn();
    b.onRangeChange(handler);
    const scope = effectScope();
    scope.run(() => {
      useViewWindow(b);
    });
    expect(handler).toHaveBeenCalledTimes(1);
    tz.value = 'America/Los_Angeles';
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[1][0].timezone).toBe('America/Los_Angeles');
    scope.stop();
  });

  it('recomputes when firstDayOfWeek changes (week-aligned views)', async () => {
    const b = newBuilder().view('week');
    const fdow = ref<0 | 1>(1); // Mon
    b.firstDayOfWeek(fdow);
    const handler = vi.fn();
    b.onRangeChange(handler);
    const scope = effectScope();
    scope.run(() => {
      useViewWindow(b);
    });
    const monStart = handler.mock.calls[0][0].start;
    fdow.value = 0; // Sunday
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[1][0].start).not.toBe(monStart);
    scope.stop();
  });

  it('does not fire onRangeChange when window is shape-equal', async () => {
    // Pin `firstDayOfWeek` numerically so the locale change below
    // doesn't *indirectly* shift the window via the locale-derived
    // fdow fallback (Article 9). With fdow fixed, locale is genuinely
    // window-irrelevant.
    const b = newBuilder().firstDayOfWeek(1);
    const handler = vi.fn();
    b.onRangeChange(handler);
    const scope = effectScope();
    scope.run(() => {
      useViewWindow(b);
    });
    expect(handler).toHaveBeenCalledTimes(1);
    // Mutate a state field that DOES NOT affect the window
    // (locale doesn't enter computeViewWindow once fdow is pinned).
    b.locale('de-AT');
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledTimes(1);
    scope.stop();
  });
});

describe('useViewWindow — single-writer invariant (C5)', () => {
  it('warns on second mount against the same builder', () => {
    const b = newBuilder();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const scope1 = effectScope();
    const scope2 = effectScope();
    scope1.run(() => {
      useViewWindow(b);
    });
    scope2.run(() => {
      useViewWindow(b);
    });
    expect(warnSpy).toHaveBeenCalled();
    expect((warnSpy.mock.calls[0][0] as string)).toMatch(
      /single writer|C5|second/i,
    );
    scope1.stop();
    scope2.stop();
    warnSpy.mockRestore();
  });

  it('disposing scope clears the active-builder set so later mounts do not false-warn', () => {
    const b = newBuilder();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const scope1 = effectScope();
    scope1.run(() => {
      useViewWindow(b);
    });
    scope1.stop();
    const scope2 = effectScope();
    scope2.run(() => {
      useViewWindow(b);
    });
    expect(warnSpy).not.toHaveBeenCalled();
    scope2.stop();
    warnSpy.mockRestore();
  });
});
