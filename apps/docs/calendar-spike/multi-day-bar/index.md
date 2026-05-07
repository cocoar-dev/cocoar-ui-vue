# Spike C — Multi-Day-Bar Layout

> **Status:** Closed. Greedy interval-graph coloring is the
> algorithm. **75–137× headroom** under Tier A targets at every
> scale.

## Question

Can the multi-day-bar layout algorithm handle 200 events per week
row in < 5 ms Tier A / < 20 ms Tier B without compromising
correctness or optimality?

## Algorithm

**Greedy interval-graph coloring.** Sort intervals by
`(start ASC, end DESC, id ASC)`, then for each interval assign the
lowest free lane. Active intervals are tracked in a min-heap keyed
by end column; free lanes in a separate min-heap of lane indices.
O(n log n) overall.

Interval graphs are *perfect graphs*: greedy first-fit on
sorted-by-start gives the chromatic number = clique number. The
algorithm uses **exactly the maximum overlap depth** as the lane
count — provably optimal.

## Tier A microbench results

Measured on the dev baseline (Snapdragon X Elite). Lower is better.

| Scale | Random distribution | Worst case (all-overlap) | Target | Headroom |
|---|---|---|---|---|
| 50 events | 6.5 µs | 4.9 µs | < 0.5 ms | **75×** |
| 200 events | 36 µs | 13 µs | < 5 ms | **137×** |
| 1000 events | 342 µs | 64 µs | < 30 ms | **87×** |
| 10 000 events (stretch) | 6.7 ms | — | — | — |

Worst case (every interval spans the full column range) is *faster*
than random because all N lanes get allocated up front and no
free-lane reuse happens during the run. Random distribution
exercises both heaps more.

## Tier A end-to-end (browser, Vue rendering included)

Live demo at `/calendar-overlap-layout` (port 5188). The slider
drives event count from 0 to 1000; Vue re-renders all bars on each
change. Layout time is timed via `performance.now()` around the call
to `layoutOverlappingIntervals`.

| Events | Lanes used | Layout time | DOM bars |
|---|---|---|---|
| 50 | 26 | 0.6 ms | 50 |
| 200 | 108 | 1.3 ms | 200 |
| 500 | 274 | 4.2 ms | 500 |
| 1000 | 554 | **5.7 ms** | 1000 |

The browser numbers include Vue's reactive reflow + per-bar style
binding. Even at 1000 bars rendered live the user sees no jank.

## Correctness

- Specific tests for empty input, single interval, all-touching,
  all-overlap, and the canonical "messy week" fixture.
- `fast-check` property tests (200 runs each):
  - one bar per input interval (id-stable)
  - start/end values preserved
  - no two bars share a (lane, column) cell
  - **laneCount = max overlap depth** (proves optimality)
  - all lanes within `[0, laneCount)`
  - deterministic output (same input → same assignment)
  - permutation-independent (input order doesn't matter)

## Decision

**Greedy stays. Locked.** The spike-plan abort criterion (switch to
sweep-line + free-list if 200/row exceeds budget) is not triggered.

## Live demo

Drive event count up to 1000 at
[`/calendar-overlap-layout`](http://localhost:5188/calendar-overlap-layout)
in the playground.

## Full results write-up

See `.local/phase-0-spike-c-results.md`.
