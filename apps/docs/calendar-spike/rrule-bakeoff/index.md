# Spike B — RRULE Engine Bake-off

> **Status:** Stub (Phase 0, Day 1) — implementation lands as Spike B progresses.

## Question

Is `rrule-rust` (WASM) viable as the default recurrence engine, and how
much faster is it than `rrule.js` on our worst-case fixtures?

## Test corpus

50 RRULE strings covering simple weekly, monthly with `BYSETPOS`, yearly
with `BYMONTH+BYDAY`, daily with `COUNT`, daily with `UNTIL`,
pathological cases (`BYSETPOS` lists, `BYDAY × BYWEEKNO`), and the full
RFC 5545 §3.8.5.3 example set.

## Benchmark scenarios

| Scenario | Description |
|---|---|
| **S1** | 1 series × 10-year span, expand all |
| **S2** | 1.000 series × 1-week window |
| **S3** | 1.000 series × 1-month window |
| **S4** | 1.000 series × 5-year span |
| **S5** | 10.000 series × 1-week window (worker-stress) |
| **S6** | Cold start: load engine + first expansion (init cost) |

Each runs against both engines, on Tier A + Tier B, 5 iterations, median
reported.

## Targets

| Metric | Target | Abort criterion |
|---|---|---|
| `rrule-rust` vs. `rrule.js` on S2 (Tier A) | ≥ 5× faster | < 2× → not worth WASM cost |
| `rrule-rust` cold start (S6, Tier A) | ≤ 200 ms | > 500 ms → fall back to JS for cold path |
| `rrule-rust` bundle (gzipped) | ≤ 150 KB total | > 200 KB → reject |
| `rrule.js` S2 Tier B | ≤ 200 ms | > 500 ms → must use rrule-rust regardless |

## Results

_Pending implementation._

## Decision

_Pending results._ Locks v0.2 §0.4.
