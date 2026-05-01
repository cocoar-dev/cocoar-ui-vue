# Spike A — 10k Fixed-Size Items

> **Status:** Stub (Phase 0, Day 1) — implementation lands as Spike A progresses.

## Question

Can `<VirtualizedSurface>` hold 60 fps Tier A / ≥ 50 fps Tier B with 10.000
fixed-size items (80 px each), recycling pool, transform-only positioning?

## Approach

Pure-function range math in `core/virtualScroll.ts` covered by Vitest +
`fast-check` property tests. Vue component `<VirtualizedSurface>` consumes
the pure functions and renders into a recycling pool of size
`viewport + 2 × overscan` items. Stress harness on this page measures FPS
client-side via rAF timestamps and server-side via Playwright + CDP.

## Targets

| Measurement | Tier A | Tier B | Abort if Tier B is |
|---|---|---|---|
| Scroll FPS, 10k fixed | ≥ 60 | ≥ 50 | < 30 |
| Measure-place latency | < 8 ms | < 16 ms | > 30 ms |
| Memory, idle | < 60 MB | < 80 MB | > 150 MB |

## Results

_Pending implementation._

## Decision

_Pending results._
