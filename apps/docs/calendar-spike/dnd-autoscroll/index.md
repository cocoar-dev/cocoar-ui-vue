# Spike D — DnD + Auto-Scroll

> **Status:** Stub (Phase 0, Day 1) — implementation lands as Spike D progresses.

## Question

Can we drive 60 fps drag with auto-scroll on Tier A, ≥ 50 fps on Tier B,
with 200 events visible?

## Approach

Pointer-events-only (`pointerdown` / `pointermove` / `pointerup`). All
movement via `transform: translate`. Auto-scroll hot zone with velocity
proportional to penetration depth. Hit-testing pure function in
`core/dragHitTest.ts`.

## Stress harness

200 placeholder events on a static week-grid layout. One draggable event
with the full DnD flow. Live FPS counter. Auto-scroll demo (drag near top
edge → scroll up).

## Targets

| Measurement | Tier A | Tier B | Abort criterion |
|---|---|---|---|
| Drag FPS, 200 events visible | 60 | ≥ 50 | < 30 Tier B |
| Auto-scroll FPS, 200 events | 60 | ≥ 50 | < 30 Tier B |
| Hit-test latency | < 0.2 ms | < 0.5 ms | > 2 ms B |

## Results

_Pending implementation._

## Decision

_Pending results._ Abort path: profile to identify whether cost is in
transform write, hit-testing, or composition. Mitigations: own compositor
layer, hit-grid cache.
