import { describe, expect, it } from 'vitest';
import { cloneRuntimeValue } from './runtimeProtocol';

describe('cloneRuntimeValue', () => {
  it('copies data-only values without retaining host references', () => {
    const source = { values: [{ id: 'one' }], enabled: true };
    const cloned = cloneRuntimeValue(source) as typeof source;

    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(cloned.values).not.toBe(source.values);
  });

  it('rejects executable values, cycles and prototype-polluting keys', () => {
    expect(() => cloneRuntimeValue({ run: () => undefined })).toThrow('unsupported type');

    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => cloneRuntimeValue(cycle)).toThrow('cycle');

    const dangerous = Object.create(null) as Record<string, unknown>;
    dangerous.constructor = 'blocked';
    expect(() => cloneRuntimeValue(dangerous)).toThrow('forbidden key');
  });

  it('enforces depth and node limits at the boundary', () => {
    let deep: Record<string, unknown> = {};
    const root = deep;
    for (let index = 0; index < 34; index += 1) {
      deep.next = {};
      deep = deep.next as Record<string, unknown>;
    }
    expect(() => cloneRuntimeValue(root)).toThrow('depth limit');

    expect(() => cloneRuntimeValue(Array.from({ length: 10_001 }, () => null))).toThrow('node limit');
  });
});
