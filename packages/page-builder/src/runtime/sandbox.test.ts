import 'ses';
import { beforeAll, describe, expect, it } from 'vitest';

describe('page script SES globals', () => {
  beforeAll(() => lockdown());

  it('does not expose browser authority or dynamic source compilation', () => {
    const compartment = new Compartment({ eval: undefined, Function: undefined });
    const globals = compartment.evaluate(`({
      window: typeof window,
      document: typeof document,
      fetch: typeof fetch,
      localStorage: typeof localStorage,
      indexedDB: typeof indexedDB,
      WebSocket: typeof WebSocket,
      XMLHttpRequest: typeof XMLHttpRequest,
      setTimeout: typeof setTimeout,
      eval: typeof eval,
      Function: typeof Function,
    })`) as Record<string, string>;

    expect(globals).toEqual({
      window: 'undefined',
      document: 'undefined',
      fetch: 'undefined',
      localStorage: 'undefined',
      indexedDB: 'undefined',
      WebSocket: 'undefined',
      XMLHttpRequest: 'undefined',
      setTimeout: 'undefined',
      eval: 'undefined',
      Function: 'undefined',
    });
  });
});
