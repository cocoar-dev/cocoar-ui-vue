# Spike A — 10k Variable-Size Items

> **Status:** Live (Phase 0, Day 2). `MeasurementCache` + anchor
> restoration validated end-to-end on Tier A.

## Question

Same surface as `10k-fixed`, but with item heights varying ~ 40–240 px
deterministically by index. Validates the **measurement cache** and the
**anchor-based scroll restoration** that keeps the user-visible content
stable when sizes change above the viewport.

## Live demo

<preview path="./demos/Stress10kVariable.vue" />

## What's new vs. the fixed-size demo

The fixed-size demo skips the entire variable-size code path. This page
exercises:

- **`MeasurementCache` lazy fill.** Items mount with the
  `estimatedItemSize` (80 px). `ResizeObserver` fires on first paint
  with the actual heights, queue is drained in a single rAF, the
  Fenwick tree updates, the range recomputes, and item transforms
  refresh — all inside one frame. The "Cache (measured / total)"
  metric shows the cache filling as you scroll.
- **Anchor restoration.** When a measurement above the viewport
  changes (e.g. a previously-unmeasured item's first paint, or an
  explicit toggle via the controls), the surface compensates
  `scrollTop` by the size delta so the user-visible content does not
  jump.
- **Strictly more work per scroll frame** than fixed-size: cache
  writes, cache reads (`prefixSum` / `indexAtOffset` for every
  re-render), anchor delta computation, silent scroll-position write.

## How to test anchor restoration

1. Scroll down 200–500 items.
2. Click **"Toggle item above viewport"**.
3. The user-visible content should not jump. The surface adjusts
   `scrollTop` so the first-visible row stays at the same screen
   y-coordinate.

A second control, **"Toggle visible item (2nd row)"**, expands the
second visible item. The first visible row (the anchor) stays in
place; everything below it shifts down to make room. That's the
expected behaviour: the anchor is the reference, items below are free
to move.

## Item-height pattern

Each item's height is a deterministic hash of its index:

```ts
const h = (y * 2654435761) >>> 0;
return 40 + (h % 200);   // 40 – 239 px
```

Three visual tiers are derived from height:

| Tier | Height | Visual |
|---|---|---|
| **compact** | 40 – 79 px | Single row, no body |
| **card** | 80 – 159 px | Body line, subtle background |
| **expanded** | 160 – 239 px | Larger body, accent border |

Reloading the page produces the same heights at the same indices —
useful for reproducing scroll behavior across sessions.

## Targets

| Measurement | Tier A | Tier B | Abort if Tier B is |
|---|---|---|---|
| Long frames during 10k-variable scroll | 0 over 5s window | ≤ 2 over 5s window | > 5 |
| Worst frame during 10k-variable scroll | < 16 ms | < 30 ms | > 50 ms |
| Anchor adjustment correctness | viewport y-coord exact | viewport y-coord exact | drift > 1 px |

## Tier A end-to-end results (LoAF-based)

Measured on the dev baseline (Snapdragon X Elite, Chrome ARM64,
production build):

- Updated as you exercise the demo above. The expected reading is **0
  long frames + worst frame < 50 ms** during normal scroll, including
  bottom-jump and toggle-while-scrolled-past.

## Decision

_Pending_ — once you've stress-tested via the demo above. If 0 long
frames during a 30-s mixed session including toggles, anchor
restoration is validated and Spike A's variable-size path is locked.
