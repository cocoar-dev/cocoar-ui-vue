import { describe, it, expect } from 'vitest';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { useDateOrTime } from '../use-date-or-time';

type Value = Temporal.PlainDate | Temporal.PlainDateTime | null;

// Deterministic converters (fixed default time, no Temporal.Now).
const converters = {
  isDateTime: (v: unknown): v is Temporal.PlainDateTime => v instanceof Temporal.PlainDateTime,
  toDateTime: (d: Temporal.PlainDate) => d.toPlainDateTime(Temporal.PlainTime.from('09:00')),
  toDate: (dt: Temporal.PlainDateTime) => dt.toPlainDate(),
};

describe('useDateOrTime', () => {
  it('splits the value for the two child pickers', () => {
    const model = ref<Value>(Temporal.PlainDate.from('2026-07-01'));
    const { dateValue, dateTimeValue } = useDateOrTime(model, ref(false), converters);
    expect(dateValue.value?.toString()).toBe('2026-07-01');
    expect(dateTimeValue.value).toBeNull();

    model.value = Temporal.PlainDateTime.from('2026-07-01T14:30');
    expect(dateValue.value).toBeNull();
    expect(dateTimeValue.value?.toString()).toBe('2026-07-01T14:30:00');
  });

  it('syncs withTime to a non-null value type (immediate)', () => {
    const withTime = ref(false);
    useDateOrTime(ref<Value>(Temporal.PlainDateTime.from('2026-07-01T09:00')), withTime, converters);
    expect(withTime.value).toBe(true);
  });

  it('syncs withTime when the value changes', async () => {
    const model = ref<Value>(null);
    const withTime = ref(true);
    useDateOrTime(model, withTime, converters);
    model.value = Temporal.PlainDate.from('2026-07-01');
    await nextTick();
    expect(withTime.value).toBe(false);
  });

  it('toggle on an empty value just flips withTime', () => {
    const model = ref<Value>(null);
    const withTime = ref(false);
    const { toggle } = useDateOrTime(model, withTime, converters);
    toggle();
    expect(withTime.value).toBe(true);
    expect(model.value).toBeNull();
  });

  it('toggle date → datetime adds the default time', () => {
    const model = ref<Value>(Temporal.PlainDate.from('2026-07-01'));
    const withTime = ref(false);
    const { toggle } = useDateOrTime(model, withTime, converters);
    toggle();
    expect(withTime.value).toBe(true);
    expect(model.value).toBeInstanceOf(Temporal.PlainDateTime);
    expect(model.value?.toString()).toBe('2026-07-01T09:00:00');
  });

  it('toggle datetime → date drops the time', () => {
    const model = ref<Value>(Temporal.PlainDateTime.from('2026-07-01T14:30'));
    const withTime = ref(true);
    const { toggle } = useDateOrTime(model, withTime, converters);
    toggle();
    expect(withTime.value).toBe(false);
    expect(model.value).toBeInstanceOf(Temporal.PlainDate);
    expect(model.value?.toString()).toBe('2026-07-01');
  });
});
