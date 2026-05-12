import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { Temporal } from '@js-temporal/polyfill';

import CoarZonedDateTimeView from '../CoarZonedDateTimeView.vue';

describe('CoarZonedDateTimeView', () => {
  const mountView = (props: Record<string, unknown> = {}) =>
    mount(CoarZonedDateTimeView, { props });

  it('formats a ZonedDateTime in its own zone with timezone label', () => {
    const w = mountView({
      value: Temporal.ZonedDateTime.from('2026-05-12T14:30:00[Europe/Vienna]'),
      dateFormat: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 },
      use24Hour: true,
    });
    // Date + time + label (label format may differ across env, just sanity-check parts)
    expect(w.text()).toContain('12.05.2026');
    expect(w.text()).toContain('14:30');
    // Label is non-empty
    expect(w.text().length).toBeGreaterThan('12.05.2026 14:30 '.length);
  });

  it('projects every value into the displayTimeZone when provided', () => {
    // Tokyo 23:00 = Vienna 16:00 (winter) / 17:00 (summer)
    const w = mountView({
      value: Temporal.ZonedDateTime.from('2026-05-12T23:00:00[Asia/Tokyo]'),
      dateFormat: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 },
      use24Hour: true,
      displayTimeZone: 'Europe/Vienna',
    });
    // May = summer (CEST), Tokyo is JST (UTC+9), Vienna is UTC+2 => 23 Tokyo = 16 Vienna
    expect(w.text()).toContain('16:00');
    expect(w.text()).toContain('12.05.2026');
  });

  it('omits zone label when showTimeZone=false', () => {
    const w = mountView({
      value: Temporal.ZonedDateTime.from('2026-05-12T14:30:00[Europe/Vienna]'),
      dateFormat: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 },
      use24Hour: true,
      showTimeZone: false,
    });
    expect(w.text()).toBe('12.05.2026 14:30');
  });

  it('renders the placeholder when value is null', () => {
    const w = mountView({ value: null, placeholder: '—' });
    expect(w.text()).toBe('—');
    expect(w.classes()).toContain('coar-zoned-date-time-view--empty');
  });

  it('rejects non-ZonedDateTime values', () => {
    const w = mountView({
      value: Temporal.PlainDateTime.from('2026-05-12T10:00:00') as unknown as Temporal.ZonedDateTime,
    });
    expect(w.text()).toBe('');
  });
});
