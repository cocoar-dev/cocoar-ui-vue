import { describe, expect, it } from 'vitest';
import { parsePdfDate } from './pdf-adapter';

describe('parsePdfDate', () => {
  it('parses a full pdf date with timezone offset', () => {
    expect(parsePdfDate("D:20230615120000+02'00'")).toBe('2023-06-15 12:00:00');
  });

  it('parses a Z-suffixed UTC date', () => {
    expect(parsePdfDate('D:20230615120000Z')).toBe('2023-06-15 12:00:00');
  });

  it('parses a date with no timezone marker', () => {
    expect(parsePdfDate('D:20230615120000')).toBe('2023-06-15 12:00:00');
  });

  it('fills missing time components with zeros', () => {
    expect(parsePdfDate('D:20230615')).toBe('2023-06-15 00:00:00');
  });

  it('fills missing minutes / seconds with zeros', () => {
    expect(parsePdfDate('D:2023061512')).toBe('2023-06-15 12:00:00');
    expect(parsePdfDate('D:202306151230')).toBe('2023-06-15 12:30:00');
  });

  it('returns the raw input when the format is not recognized', () => {
    expect(parsePdfDate('2023-06-15')).toBe('2023-06-15');
    expect(parsePdfDate('not a date')).toBe('not a date');
  });

  it('returns undefined for empty / undefined input', () => {
    expect(parsePdfDate(undefined)).toBeUndefined();
    expect(parsePdfDate('')).toBeUndefined();
  });
});
