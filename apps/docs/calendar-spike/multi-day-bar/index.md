# Spike C — Multi-Day-Bar Layout

> **Status:** Stub (Phase 0, Day 1) — implementation lands as Spike C progresses.

## Question

Can interval-graph coloring handle 200 events / week row in < 5 ms Tier A
and < 20 ms Tier B?

## Algorithm

Greedy interval-graph coloring sorted by `start ASC, end DESC`. Each event
grabs the lowest-numbered lane available across its column span. Pure
function `layoutMultiDayBars(input): LayoutOutput` in
`core/overlapLayout.ts`.

## Tests

- Vitest unit tests with `fast-check`: invariants
  (no two events share a lane × column intersection;
  lane count ≤ |events|; output deterministic for same input)
- Snapshot tests with the standard "messy week" fixture (12 events with
  4-deep overlap, bridging Sunday/Monday)
- Vitest microbench (`bench()`) — 50 / 200 / 1.000 events / row

## Targets

| Scenario | Target Tier A | Target Tier B | Abort criterion |
|---|---|---|---|
| 50 events / row | < 0.5 ms | < 2 ms | > 5 ms B |
| 200 events / row | < 5 ms | < 20 ms | > 50 ms B |
| 1.000 events / row | < 30 ms | < 100 ms | > 300 ms B |

## Results

_Pending implementation._

## Decision

_Pending results._ Greedy stays unless 200/row exceeds budget — then switch
to sweep-line + free-list.
