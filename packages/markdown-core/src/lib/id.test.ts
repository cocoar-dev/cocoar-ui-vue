import { describe, expect, it } from 'vitest';
import { hashStringFNV1a32, createNodeId } from './id';

describe('hashStringFNV1a32', () => {
  it('produces consistent results for the same input', () => {
    const a = hashStringFNV1a32('test-seed');
    const b = hashStringFNV1a32('test-seed');
    expect(a).toBe(b);
  });

  it('returns a non-negative number', () => {
    const result = hashStringFNV1a32('anything');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('produces different hashes for different inputs', () => {
    const a = hashStringFNV1a32('seed-one');
    const b = hashStringFNV1a32('seed-two');
    expect(a).not.toBe(b);
  });
});

describe('createNodeId', () => {
  it('produces deterministic IDs', () => {
    const a = createNodeId('my-seed');
    const b = createNodeId('my-seed');
    expect(a).toBe(b);
  });

  it('returns a non-empty string', () => {
    const id = createNodeId('test');
    expect(id.length).toBeGreaterThan(0);
  });

  it('produces different IDs for different seeds', () => {
    const a = createNodeId('seed-alpha');
    const b = createNodeId('seed-beta');
    expect(a).not.toBe(b);
  });

  it('returns a base-36 encoded string', () => {
    const id = createNodeId('some-seed');
    expect(id).toMatch(/^[0-9a-z]+$/);
  });
});
