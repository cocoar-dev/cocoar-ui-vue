/**
 * Engine adapters for the Spike B bake-off.
 *
 * Each adapter exposes the same call signature
 *
 *   expand(fixture, windowStart, windowEnd) -> count of occurrences
 *
 * so the bench harness can drive all engines uniformly. We return a
 * count rather than the actual dates because:
 *
 *   1. The engines return different concrete types (`Date`, internal
 *      DateTime classes, Temporal.ZonedDateTime). Forcing a common
 *      type would push conversion cost into the hot path and skew
 *      the benchmark.
 *
 *   2. The `verify` helper at the bottom cross-checks counts across
 *      all three engines on every fixture; agreement to within ±1 is
 *      strong evidence the engines all agree on the rule.
 *
 * The adapters are thin — each calls the library's most natural
 * "expand within a window" method. We pay no extra cost beyond what
 * a real consumer would.
 */

import type { RuleFixture } from './recurrence-corpus';
import { toIcalString } from './recurrence-corpus';

import { rrulestr } from 'rrule';
// rrule-rust ESM exports
import * as RRuleRust from 'rrule-rust';
import { RRuleTemporal } from 'rrule-temporal';

// ─── Engine: rrule (canonical JS) ──────────────────────────────────────

export function expandRrule(
  fixture: RuleFixture,
  windowStart: Date,
  windowEnd: Date,
): number {
  const set = rrulestr(toIcalString(fixture));
  const occurrences = set.between(windowStart, windowEnd, true);
  return occurrences.length;
}

// ─── Engine: rrule-rust (WASM) ─────────────────────────────────────────

interface RruleRustDateTime {
  toString(): string;
}
interface RruleRustSet {
  all(limit?: number): RruleRustDateTime[];
  between(after: RruleRustDateTime, before: RruleRustDateTime, inclusive: boolean): RruleRustDateTime[];
}
interface RruleRustModule {
  DateTime: { fromTimestamp(ms: number, tzid: string): RruleRustDateTime };
  RRuleSet: { fromString(s: string): RruleRustSet };
}

const RR = RRuleRust as unknown as RruleRustModule;

export function expandRruleRust(
  fixture: RuleFixture,
  windowStart: Date,
  windowEnd: Date,
): number {
  const set = RR.RRuleSet.fromString(toIcalString(fixture));
  // `between` takes DateTime instances. We pass UTC because `windowStart` /
  // `windowEnd` are JS Date objects and JS Dates are absolute (UTC) instants.
  // The fixture's own tzid governs the OCCURRENCE timezone; the window
  // bounds are timezone-agnostic absolute timestamps.
  const a = RR.DateTime.fromTimestamp(windowStart.getTime(), 'UTC');
  const b = RR.DateTime.fromTimestamp(windowEnd.getTime(), 'UTC');
  const out = set.between(a, b, true);
  return out.length;
}

// ─── Engine: rrule-temporal ────────────────────────────────────────────

export function expandRruleTemporal(
  fixture: RuleFixture,
  windowStart: Date,
  windowEnd: Date,
): number {
  const rule = new RRuleTemporal({ rruleString: toIcalString(fixture) });
  const occurrences = rule.between(windowStart, windowEnd, true);
  return occurrences.length;
}

// ─── Verification helper ───────────────────────────────────────────────

export interface VerifyResult {
  fixtureId: string;
  rrule: number;
  rruleRust: number;
  rruleTemporal: number;
  /** True if all three engines produced equal counts (or all errored). */
  agree: boolean;
  errors: { engine: string; message: string }[];
}

export function verifyAgreement(
  fixtures: readonly RuleFixture[],
  windowStart: Date,
  windowEnd: Date,
): VerifyResult[] {
  return fixtures.map((f) => {
    const errors: { engine: string; message: string }[] = [];
    let r = -1;
    let rr = -1;
    let rt = -1;
    try { r = expandRrule(f, windowStart, windowEnd); } catch (e) {
      errors.push({ engine: 'rrule', message: (e as Error).message });
    }
    try { rr = expandRruleRust(f, windowStart, windowEnd); } catch (e) {
      errors.push({ engine: 'rrule-rust', message: (e as Error).message });
    }
    try { rt = expandRruleTemporal(f, windowStart, windowEnd); } catch (e) {
      errors.push({ engine: 'rrule-temporal', message: (e as Error).message });
    }
    const counts = [r, rr, rt].filter((n) => n >= 0);
    const agree = counts.length > 0 && counts.every((n) => n === counts[0]);
    return { fixtureId: f.id, rrule: r, rruleRust: rr, rruleTemporal: rt, agree, errors };
  });
}
