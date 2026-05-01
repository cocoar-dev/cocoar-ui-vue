import { describe, it, expect } from 'vitest';

/**
 * Sentinel test — validates the Vitest toolchain is wired up for the
 * calendar package. Real `core/` tests land in Phase 1 (per design doc
 * §16.1 they are property-tested with fast-check and required to be at
 * 100% line/branch coverage).
 *
 * Remove this file once the first real `core/` test exists.
 */
describe('@cocoar/vue-calendar — skeleton', () => {
  it('test toolchain is operational', () => {
    expect(true).toBe(true);
  });
});
