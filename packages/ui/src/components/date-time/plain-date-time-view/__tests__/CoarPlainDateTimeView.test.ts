import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { Temporal } from '@js-temporal/polyfill';

import CoarPlainDateTimeView from '../CoarPlainDateTimeView.vue';

describe('CoarPlainDateTimeView', () => {
  const mountView = (props: Record<string, unknown> = {}) =>
    mount(CoarPlainDateTimeView, { props });

  it('formats a PlainDateTime with 24h time by default', () => {
    const w = mountView({
      value: Temporal.PlainDateTime.from('2026-05-12T14:30:00'),
      dateFormat: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 },
      use24Hour: true,
    });
    expect(w.text()).toBe('12.05.2026 14:30');
  });

  it('honors 12-hour clock override', () => {
    const w = mountView({
      value: Temporal.PlainDateTime.from('2026-05-12T14:30:00'),
      dateFormat: { pattern: 'mm/dd/yyyy', firstDayOfWeek: 7 },
      use24Hour: false,
    });
    expect(w.text()).toBe('05/12/2026 2:30 PM');
  });

  it('renders the placeholder when value is null', () => {
    const w = mountView({ value: null, placeholder: '—' });
    expect(w.text()).toBe('—');
    expect(w.classes()).toContain('coar-plain-date-time-view--empty');
  });

  it('rejects non-PlainDateTime values', () => {
    const w = mountView({
      value: Temporal.PlainDate.from('2026-05-12') as unknown as Temporal.PlainDateTime,
    });
    expect(w.text()).toBe('');
  });

  it('cross-realm-safe duck type works', () => {
    const fake = {
      year: 2026, month: 5, day: 12, hour: 14, minute: 30,
      toPlainDate: () => Temporal.PlainDate.from('2026-05-12'),
      get [Symbol.toStringTag]() { return 'Temporal.PlainDateTime'; },
    };
    const w = mountView({
      value: fake as unknown as Temporal.PlainDateTime,
      dateFormat: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 },
      use24Hour: true,
    });
    expect(w.text()).toBe('12.05.2026 14:30');
  });
});
