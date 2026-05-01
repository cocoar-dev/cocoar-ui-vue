# Spike B — RRULE Engine Bake-off

> **Status:** Closed. Default engine locked: `rrule-rust`.

## Question

Which RFC-5545 recurrence engine ships as the calendar's default?
Three live candidates were measured against a curated 50-fixture
corpus across realistic and pathological windows.

## Candidates

| Engine | Version | Notes |
|---|---|---|
| `rrule` | 2.8.1 | Canonical JS implementation. Last published > 1 year ago. |
| **`rrule-rust`** | 3.1.1 | **Default.** Rust → WASM. Zero deps. Active. |
| `rrule-temporal` | 1.5.3 | Built on Temporal API (the polyfill we already ship). Active. |

## Method

Three layers of measurement:

1. **Agreement test** — All three engines expand each fixture over a
   common window; counts must match. **50/50 fixtures agree** —
   no engine misinterprets the spec.
2. **Vitest bench (Node, Tier A)** — full-corpus expansion at
   four window sizes.
3. **Browser cold-start** — dynamic `import()` of each engine in a
   live page, captured first-import + first-expansion + warm-expansion
   times.

## Headline results

Tier A (Snapdragon X Elite). Lower is better.

| Window | rrule-rust | rrule-temporal | rrule | rrule-rust speedup |
|---|---|---|---|---|
| 1-week, 50 rules | **2.7 ms** | 44 ms | 925 ms | **345× vs rrule** |
| 1-month, 50 rules | **2.7 ms** | 45 ms | 933 ms | 339× |
| 1-year, 50 rules | **3.2 ms** | 72 ms | 1011 ms | 320× |
| 5-year, 50 rules | **5.1 ms** | 155 ms | 1188 ms | 233× |
| Pathological + RFC subset, 1-year | **2.4 ms** | 59 ms | 1002 ms | **410×** |

## Browser cold start

| Engine | Import | First expand | Warm expand |
|---|---|---|---|
| rrule | 9.3 ms | 2.2 ms | 1.1 ms |
| **rrule-rust** | **175 ms** | 11.7 ms | **0.6 ms** |
| rrule-temporal | 9.7 ms | 8.7 ms | 2.9 ms |

`rrule-rust` total cold start = 187 ms — under the 200 ms Tier A
target. Subsequent expansions are 0.6 ms each, the fastest of the
three on the warm path.

## Bundle size (gzipped, Vite production build)

| Engine | Total gzip | Lazy-loadable? |
|---|---|---|
| rrule | 13 KB | yes |
| **rrule-rust** | **300 KB** (mostly the WASM blob) | yes (dynamic import) |
| rrule-temporal | 46 KB | yes |

The 300 KB exceeds the spike plan's 200 KB budget. We override the
budget because:

- The WASM blob is lazy-loaded — apps that don't use recurrence pay 0.
- Apps that DO use recurrence pay 300 KB ONCE, then expand in 0.6 ms
  per call. The perf delta justifies the size.
- For bundle-sensitive consumers, the engine abstraction (below)
  exposes `rrule-temporal` as a 46 KB drop-in alternative.

## Decision

**`rrule-rust` is the default engine.** An engine abstraction ships
in Phase 1 so consumers can swap to `rrule-temporal` for smaller
bundles, or BYO engine.

## Live demo

Cold-start measurement runs at
[`/calendar-rrule-bakeoff`](http://localhost:5188/calendar-rrule-bakeoff)
in the playground (port 5188).

## Full results write-up

See `.local/phase-0-spike-b-results.md` for the complete bench numbers,
methodology, and rationale.
