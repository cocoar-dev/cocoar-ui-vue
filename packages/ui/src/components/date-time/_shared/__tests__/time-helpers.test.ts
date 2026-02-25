import { describe, it, expect } from 'vitest';
import {
  coarDetect12HourFormat,
  coarFormatTime,
  coarParseTimeInput,
  coarConvertTo12Hour,
  coarConvertTo24Hour,
  coarIncrementHours,
  coarIncrementMinutes,
  coarRoundMinutesToStep,
  coarGetValidMinutes,
} from '../time-helpers';

describe('coarDetect12HourFormat', () => {
  it('returns true for en-US', () => {
    expect(coarDetect12HourFormat('en-US')).toBe(true);
  });

  it('returns false for de-DE', () => {
    expect(coarDetect12HourFormat('de-DE')).toBe(false);
  });

  it('returns false for invalid locale', () => {
    expect(coarDetect12HourFormat('xxx-INVALID')).toBe(false);
  });
});

describe('coarFormatTime', () => {
  it('formats 24h time', () => {
    expect(coarFormatTime(14, 30, true)).toBe('14:30');
    expect(coarFormatTime(0, 5, true)).toBe('00:05');
    expect(coarFormatTime(23, 59, true)).toBe('23:59');
  });

  it('formats 12h time', () => {
    expect(coarFormatTime(14, 30, false)).toBe('2:30 PM');
    expect(coarFormatTime(0, 5, false)).toBe('12:05 AM');
    expect(coarFormatTime(12, 0, false)).toBe('12:00 PM');
    expect(coarFormatTime(23, 59, false)).toBe('11:59 PM');
  });
});

describe('coarParseTimeInput', () => {
  it('parses 24h format', () => {
    expect(coarParseTimeInput('14:30')).toEqual({ hours: 14, minutes: 30 });
    expect(coarParseTimeInput('00:00')).toEqual({ hours: 0, minutes: 0 });
    expect(coarParseTimeInput('23:59')).toEqual({ hours: 23, minutes: 59 });
  });

  it('parses 12h format', () => {
    expect(coarParseTimeInput('2:30 PM')).toEqual({ hours: 14, minutes: 30 });
    expect(coarParseTimeInput('12:00 AM')).toEqual({ hours: 0, minutes: 0 });
    expect(coarParseTimeInput('12:00 PM')).toEqual({ hours: 12, minutes: 0 });
  });

  it('returns null for invalid input', () => {
    expect(coarParseTimeInput('')).toBeNull();
    expect(coarParseTimeInput('invalid')).toBeNull();
    expect(coarParseTimeInput('25:00')).toBeNull();
    expect(coarParseTimeInput('13:00 PM')).toBeNull();
  });
});

describe('coarConvertTo12Hour', () => {
  it('converts midnight', () => {
    expect(coarConvertTo12Hour(0)).toEqual({ hours: 12, period: 'AM' });
  });

  it('converts noon', () => {
    expect(coarConvertTo12Hour(12)).toEqual({ hours: 12, period: 'PM' });
  });

  it('converts afternoon', () => {
    expect(coarConvertTo12Hour(14)).toEqual({ hours: 2, period: 'PM' });
  });

  it('converts morning', () => {
    expect(coarConvertTo12Hour(9)).toEqual({ hours: 9, period: 'AM' });
  });
});

describe('coarConvertTo24Hour', () => {
  it('converts 12 AM to 0', () => {
    expect(coarConvertTo24Hour(12, 'AM')).toBe(0);
  });

  it('converts 12 PM to 12', () => {
    expect(coarConvertTo24Hour(12, 'PM')).toBe(12);
  });

  it('converts 2 PM to 14', () => {
    expect(coarConvertTo24Hour(2, 'PM')).toBe(14);
  });

  it('converts 9 AM to 9', () => {
    expect(coarConvertTo24Hour(9, 'AM')).toBe(9);
  });
});

describe('coarIncrementHours', () => {
  it('wraps from 23 to 0', () => {
    expect(coarIncrementHours(23, 1)).toBe(0);
  });

  it('wraps from 0 to 23', () => {
    expect(coarIncrementHours(0, -1)).toBe(23);
  });

  it('increments normally', () => {
    expect(coarIncrementHours(14, 2)).toBe(16);
  });
});

describe('coarIncrementMinutes', () => {
  it('wraps with hour carry', () => {
    expect(coarIncrementMinutes(55, 5)).toEqual({ minutes: 0, hourDelta: 1 });
  });

  it('wraps backwards with negative carry', () => {
    expect(coarIncrementMinutes(0, -5)).toEqual({ minutes: 55, hourDelta: -1 });
  });

  it('respects step', () => {
    expect(coarIncrementMinutes(30, 1, 15)).toEqual({ minutes: 45, hourDelta: 0 });
  });

  it('no carry within range', () => {
    expect(coarIncrementMinutes(10, 5)).toEqual({ minutes: 15, hourDelta: 0 });
  });
});

describe('coarRoundMinutesToStep', () => {
  it('rounds down', () => {
    expect(coarRoundMinutesToStep(7, 5)).toBe(5);
  });

  it('rounds up', () => {
    expect(coarRoundMinutesToStep(8, 5)).toBe(10);
  });

  it('rounds to nearest 15', () => {
    expect(coarRoundMinutesToStep(22, 15)).toBe(15);
    expect(coarRoundMinutesToStep(23, 15)).toBe(30);
  });
});

describe('coarGetValidMinutes', () => {
  it('returns 12 values for step 5', () => {
    const values = coarGetValidMinutes(5);
    expect(values).toHaveLength(12);
    expect(values[0]).toBe(0);
    expect(values[11]).toBe(55);
  });

  it('returns 4 values for step 15', () => {
    expect(coarGetValidMinutes(15)).toEqual([0, 15, 30, 45]);
  });

  it('returns 60 values for step 1', () => {
    expect(coarGetValidMinutes(1)).toHaveLength(60);
  });
});
