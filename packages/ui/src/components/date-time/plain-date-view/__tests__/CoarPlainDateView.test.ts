import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { Temporal } from '@js-temporal/polyfill';

import CoarPlainDateView from '../CoarPlainDateView.vue';

describe('CoarPlainDateView', () => {
  const mountView = (props: Record<string, unknown> = {}) =>
    mount(CoarPlainDateView, { props });

  it('formats a PlainDate using the resolved date format', () => {
    const w = mountView({
      value: Temporal.PlainDate.from('2026-05-12'),
      dateFormat: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 },
    });
    expect(w.text()).toBe('12.05.2026');
  });

  it('honors a different format pattern', () => {
    const w = mountView({
      value: Temporal.PlainDate.from('2026-05-12'),
      dateFormat: { pattern: 'mm/dd/yyyy', firstDayOfWeek: 7 },
    });
    expect(w.text()).toBe('05/12/2026');
  });

  it('renders the placeholder when value is null', () => {
    const w = mountView({ value: null, placeholder: '—' });
    expect(w.text()).toBe('—');
    expect(w.classes()).toContain('coar-plain-date-view--empty');
  });

  it('renders empty (no placeholder) by default for null', () => {
    const w = mountView({ value: null });
    expect(w.text()).toBe('');
    expect(w.classes()).toContain('coar-plain-date-view--empty');
  });

  it('rejects non-PlainDate values (renders empty)', () => {
    const w = mountView({
      value: new Date('2026-05-12') as unknown as Temporal.PlainDate,
      placeholder: '—',
    });
    expect(w.text()).toBe('—');
  });

  it('rejects PlainDateTime in a PlainDate slot', () => {
    const w = mountView({
      value: Temporal.PlainDateTime.from('2026-05-12T10:00:00') as unknown as Temporal.PlainDate,
    });
    expect(w.text()).toBe('');
  });

  it('cross-realm-safe type check accepts toStringTag duck-type', () => {
    const fake = {
      year: 2026,
      month: 5,
      day: 12,
      get [Symbol.toStringTag]() { return 'Temporal.PlainDate'; },
    };
    const w = mountView({
      value: fake as unknown as Temporal.PlainDate,
      dateFormat: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 },
    });
    expect(w.text()).toBe('12.05.2026');
  });

  it('applies size class', () => {
    const w = mountView({ value: null, size: 'l' });
    expect(w.classes()).toContain('coar-plain-date-view--l');
  });
});
