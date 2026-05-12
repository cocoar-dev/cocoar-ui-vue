/**
 * Phase 4 §A8 — `builder.recurrenceEngine()` setter.
 *
 * Step 4 v1 ships the SETTER + manual-integration pattern. Auto-
 * expansion via the events watcher is Phase 4.1 (follow-up PR).
 *
 * Until then, consumers integrate recurrence via their `eventsLoader`:
 *
 * ```ts
 * builder.recurrenceEngine(new RruleTemporalEngine());
 * builder.eventsLoader(async (window) => {
 *   const expanded = await Promise.all(
 *     mySeries.map((s) =>
 *       expandSeries(s, toExpansionWindow(window), 'compatible',
 *         builder.state.recurrenceEngine ?? undefined),
 *     ),
 *   );
 *   return [...nonRecurring, ...expanded.flat()];
 * });
 * ```
 */

import { describe, expect, it } from 'vitest';
import { useCalendar } from '../../useCalendar';
import { RruleTemporalEngine } from '../../recurrence-rrule-temporal/index';
import type { RecurrenceEngine } from '../../recurrence/types';

describe('builder.recurrenceEngine()', () => {
  it('defaults to null (lazy default applies at expandSeries call site)', () => {
    const { builder } = useCalendar();
    expect(builder.state.recurrenceEngine).toBeNull();
  });

  it('stores an engine instance', () => {
    const { builder } = useCalendar();
    const engine = new RruleTemporalEngine();
    builder.recurrenceEngine(engine);
    expect(builder.state.recurrenceEngine).toBe(engine);
  });

  it('stores a factory function (SSR-friendly form)', () => {
    const { builder } = useCalendar();
    const factory = () => new RruleTemporalEngine();
    builder.recurrenceEngine(factory);
    expect(builder.state.recurrenceEngine).toBe(factory);
  });

  it('chains like every other setter', () => {
    const { builder } = useCalendar();
    const result = builder
      .timezone('Europe/Vienna')
      .recurrenceEngine(new RruleTemporalEngine())
      .dstPolicy('reject');
    expect(result).toBe(builder);
  });

  it('replaces a previously-set engine', () => {
    const { builder } = useCalendar();
    const a = new RruleTemporalEngine();
    const b = new RruleTemporalEngine();
    builder.recurrenceEngine(a);
    builder.recurrenceEngine(b);
    expect(builder.state.recurrenceEngine).toBe(b);
    expect(builder.state.recurrenceEngine).not.toBe(a);
  });

  it('accepts a custom RecurrenceEngine implementation (dependency injection)', () => {
    const { builder } = useCalendar();
    // Sentinel-shaped mock: a real implementation would do the
    // actual expansion. The builder stores it verbatim — no
    // validation of the engine's behavior at the setter call site.
    const mock: RecurrenceEngine = {
      expand: async () => ({ results: [], errors: [] }),
    };
    builder.recurrenceEngine(mock);
    expect(builder.state.recurrenceEngine).toBe(mock);
  });
});
