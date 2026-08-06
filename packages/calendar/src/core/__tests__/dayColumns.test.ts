import { describe, expect, it } from 'vitest';
import { responsiveDayColumnCount } from '../dayColumns';

describe('responsiveDayColumnCount', () => {
  it('grows with width and honours the configured minimum', () => {
    expect(responsiveDayColumnCount(390, 1, 220)).toBe(1);
    expect(responsiveDayColumnCount(1024, 1, 220)).toBe(4);
    expect(responsiveDayColumnCount(390, 2, 220)).toBe(2);
  });

  it('clamps invalid and extreme inputs', () => {
    expect(responsiveDayColumnCount(0, 0)).toBe(1);
    expect(responsiveDayColumnCount(10000, 1, 220)).toBe(7);
  });
});
