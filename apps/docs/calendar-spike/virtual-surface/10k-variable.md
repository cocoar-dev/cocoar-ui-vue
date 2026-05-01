# Spike A — 10k Variable-Size Items

> **Status:** Stub (Phase 0, Day 1) — implementation lands as Spike A progresses.

## Question

Same surface as `10k-fixed` but with item heights varying 40–240 px.
Validates the measurement cache and anchor-based scroll restoration when
items above the viewport resize.

## Targets

| Measurement | Tier A | Tier B | Abort if Tier B is |
|---|---|---|---|
| Scroll FPS, 10k variable | ≥ 60 | ≥ 50 | < 30 |
| Anchor adjustment correctness | exact | exact | drift > 1 px |
| Re-measure batch cost | < 4 ms / 100 items | < 12 ms / 100 items | > 30 ms |

## Results

_Pending implementation._

## Decision

_Pending results._
