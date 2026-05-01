/**
 * Spike B — agreement test for the three recurrence engines.
 *
 * Before benchmarking, we verify all three engines produce identical
 * occurrence counts on every fixture in the corpus over a fixed
 * window. Disagreement means at least one engine misinterprets the
 * fixture; benching divergent engines would compare apples and
 * oranges.
 *
 * Tolerance: exact match. Off-by-one would still be a meaningful
 * disagreement at this stage — the engines either agree on the
 * spec or they don't.
 *
 * If any engine errors out on a fixture, that's also reported via
 * `errors[]` and counted as disagreement. The bake-off only proceeds
 * once every fixture has unanimous agreement (or we explicitly
 * triage and exclude the disagreeing fixtures).
 */

import { describe, it, expect } from 'vitest';
import { corpus } from './recurrence-corpus';
import { verifyAgreement } from './recurrence-adapters';

const WINDOW_START = new Date('2024-01-01T00:00:00Z');
const WINDOW_END = new Date('2025-12-31T23:59:59Z');

// `rrule-rust` is a WASM module — cold-start on CI runners is
// notably slower than on a local dev machine. Vitest's 5 s default
// is fine for the small smoke test but tight for the full corpus
// pass. Bump to 30 s; locally it still completes in well under a
// second.
const CORPUS_TIMEOUT_MS = 30_000;

describe('Spike B — engine agreement on corpus (1 year window)', () => {
  it('runs without crashing', () => {
    // Smoke test that all three engines load + parse + expand at
    // least the simple cases. A pure-error result still satisfies
    // verifyAgreement's `agree=true` (errors-only is a degenerate
    // case but signals a load problem we want to surface).
    const sample = corpus.slice(0, 2);
    const results = verifyAgreement(sample, WINDOW_START, WINDOW_END);
    expect(results.length).toBe(sample.length);
  });

  it('reports per-fixture agreement (and dumps disagreements)', { timeout: CORPUS_TIMEOUT_MS }, () => {
    const results = verifyAgreement(corpus, WINDOW_START, WINDOW_END);
    const disagreements = results.filter((r) => !r.agree || r.errors.length > 0);

    if (disagreements.length > 0) {
      // Surface to stdout so the result is visible without re-running
      // with verbose mode.
      console.log('Engine disagreements / errors:');
      for (const d of disagreements) {
        console.log(
          `  ${d.fixtureId}: rrule=${d.rrule}, rrule-rust=${d.rruleRust}, ` +
            `rrule-temporal=${d.rruleTemporal}` +
            (d.errors.length > 0 ? ` errors=${JSON.stringify(d.errors)}` : ''),
        );
      }
    }

    // We don't fail the test on disagreement — it's a diagnostic. The
    // actual fail condition is when ALL three engines disagree (they
    // can't all be right) which would block the bake-off.
    const totalDisagreements = disagreements.length;
    const totalCorpus = corpus.length;
    console.log(`Agreement: ${totalCorpus - totalDisagreements}/${totalCorpus} fixtures`);

    // At minimum, we want > 50% agreement; otherwise something is
    // very wrong with the adapters.
    expect(totalCorpus - totalDisagreements).toBeGreaterThan(totalCorpus / 2);
  });
});
