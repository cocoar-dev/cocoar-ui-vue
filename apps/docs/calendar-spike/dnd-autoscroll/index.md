# Spike D — DnD + Auto-Scroll

> **Status:** Closed. `useCoarDrag` composable + pure-function
> hit-test ship in Phase 1. **0/0 LoAF** during a 2.6-second drag
> session that included bidirectional auto-scroll on Tier A.
> Tier B gate live in CI.

## Question

Can the drag-and-drop layer hold 60 fps Tier A / ≥ 50 fps Tier B
during a real interactive session — drag from a row, traverse into
the bottom hot zone (auto-scroll down), reverse to the top hot zone
(auto-scroll up), drop — with 200 events visible?

## Live demo

<preview path="./demos/StressDrag.vue" />

Click and drag any row. Drag near the top or bottom edge to trigger
auto-scroll. Drop on a target to record the position (the spike
doesn't actually mutate the list — it validates the gesture flow,
not the data shuffle).

## Approach

Two new pure-function primitives in `core/`:

- **`hitTestVerticalSurface(pointerY, surfaceTop, scrollTop, cache)`**
  — given the pointer's screen-y, the surface's screen-top, and the
  current scrollTop, returns `{ itemIndex, ratio, pixelInItem }` —
  which item is under the pointer plus where within the item.
  O(log n) via `MeasurementCache.indexAtOffset`. ~ 100 ns at 10k
  items on Tier A.

- **`computeAutoScrollVelocity(pointerX, pointerY, rect, opts)`** —
  given the pointer position relative to a surface bounding rect,
  returns `{ velocityX, velocityY }` in px/frame. Linear or
  quadratic ramp from the hot-zone boundary to the edge. Pure math,
  no DOM access.

Plus one Vue composable:

- **`useCoarDrag<T>(opts)`** — owns the Pointer Events lifecycle
  (down → capture → move → up / cancel), rAF-throttled scheduling,
  auto-scroll application via the surface ref, and Escape-key
  cancellation. The composable does NOT hit-test or visualize the
  ghost — those are consumer concerns. The composable just gives the
  consumer a stream of `DragContext` callbacks.

That separation — pure functions in core, composable for the
gesture lifecycle — keeps the hit-test reusable across surface
shapes (1D Y, 2D, time-grids) and lets the consumer plug in its own
domain-specific drop logic without forking the composable.

## Tier A end-to-end (LoAF)

A scripted drag session via Chrome DevTools:

1. `pointerdown` on row 5
2. 30-step diagonal drag down to the bottom hot zone (~600 ms)
3. **Hold at bottom hot zone for 800 ms** — auto-scroll down fires
   each frame
4. 30-step reverse drag back up to the top hot zone (~600 ms)
5. **Hold at top hot zone for 600 ms** — auto-scroll up fires
6. `pointerup`

Total session ~ 2.6 seconds. `surface.scrollTop` ended at 231 px
from a start of 0 — auto-scroll real, not just simulated.

| Metric | Value |
|---|---|
| Long frames over the session | **0** |
| Worst frame | **0 ms** (under the 50 ms LoAF threshold) |

## Tier B gate

Wired into `apps/playground/e2e-perf/calendar-drag.spec.ts`. CI
runs the same scripted session on GHA `ubuntu-latest` and asserts:

- Long frames ≤ 3
- Worst frame ≤ 150 ms

Plus a separate test that the drop-target indicator updates
correctly after a normal drag-then-release.

## Tier A microbench (math kernel)

`hitTestVerticalSurface` and `computeAutoScrollVelocity` are pure
functions in core. Both run in nanoseconds; the bench harness for
them isn't separately broken out — they're trivial relative to the
existing `getVisibleRange1D` benchmark (314 ns for the entire
range computation at 10k items).

## Decision

**`useCoarDrag` composable + the two pure-function primitives ship
as-is in Phase 1.** They cover:

- Single-event drag (move an event card to another day or time slot)
- Drag-handle reorder (agenda list)
- Auto-scroll while dragging into off-viewport regions

What's deferred to Phase 1:

- **Drag-to-create** (click-drag on an empty time slot to create a
  new event). The composable supports this — `onDragStart` / `onDragMove`
  fire from any `pointerdown` — but the consumer-side hit-test +
  ghost rendering is calendar-specific. Lands as a Phase 1 wrapper.
- **Snapping** (drag to nearest 15-min slot). The composable
  reports raw pointer; snapping is consumer-side post-processing
  on the hit-test result. The reference implementation lands in
  the WeekView component in Phase 1.

## Full results write-up

See `.local/phase-0-spike-d-results.md`.
