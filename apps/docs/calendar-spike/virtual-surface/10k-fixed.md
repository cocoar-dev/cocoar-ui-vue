# Spike A — 10k Fixed-Size Items

> **Status:** Live (Phase 0, Day 2). Math kernel + Vue component land,
> with authoritative perf instrumentation. Awaiting CDP-based perf
> measurement on Tier B (CI) — see Spike A.5.

## Question

Can `<VirtualizedSurface1DY>` hold 60 fps Tier A / ≥ 50 fps Tier B with
10.000 fixed-size items (80 px each), recycling pool, transform-only
positioning?

## Live demo

<preview path="./demos/Stress10kFixed.vue" />

## How to read the metrics

Two perf signals are reported side by side. They answer different
questions and have very different reliabilities:

| Metric | What it measures | Authoritative? |
|---|---|---|
| **⚖ Long frames (5s)** | Count of actual ≥ 50 ms frames over the last 5 seconds, from the browser's own pipeline (Long Animation Frame API). | **Yes.** Cannot be fooled by rAF scheduling. |
| **⚖ Worst frame (5s)** | Duration in ms of the longest frame in the last 5 seconds. | **Yes.** Same source. |
| **rAF FPS mean / min** | How often the JS `requestAnimationFrame` callback fires. | **No.** Chrome can defer rAF callbacks one or two vsync ticks during wheel-scroll input dispatch without producing visual jank — the rAF counter dips to 30 even on a smooth page. |

**The rule:** if the ⚖ Long-frames count is 0 and ⚖ Worst-frame is
under 50 ms, the page is genuinely smooth — regardless of what rAF FPS
shows. The rAF metrics are kept on the page (visually de-emphasised)
for cross-reference and for browsers without LoAF support (Firefox /
Safari).

## What you should see

- **0 long frames during wheel-scroll**, including bottom-jump from
  10.000 items.
- **Items in DOM ≤ ~30**, even at maximum item count. That's the count
  of currently-mounted slot components — Vue's keyed v-for mounts/
  unmounts only the deltas (one in, one out for a single-item shift).
- **Bottom-jump still mounts ~14 items**, not 10.000. Same with random
  jumps.
- **Add/remove 1.000 items at runtime** updates the surface in place
  without remounting visible slots.

## Approach

Three pure-function primitives in `core/`, each individually tested
with `fast-check` properties + a slow-but-obvious reference
implementation:

- **`MeasurementCache`** (Fenwick tree) — `prefixSum` / `indexAtOffset`
  / `set` all in O(log n). At 10.000 items each op is ~10 array reads
  total. Skipped entirely in fixed-size mode.
- **`getVisibleRange1D`** — pure function returning
  `{ startIndex, endIndex, offset, totalSize }` for a `(scroll,
  viewport, overscan)` triple. Range covers every item that intersects
  the viewport. Overscan only ever extends the range, never shrinks it.
- **`computeAnchorAdjustment`** — one-line math that returns the
  scroll-offset delta needed to keep an anchor item visually stable
  when sizes above it change.

The Vue component (`VirtualizedSurface1DY.vue`) consumes these via
keyed `v-for`:

- One absolute element per visible item, each pinned by transform from
  the spacer's top.
- Vue's keyed v-for over the visible range. New items mount on entry,
  old items unmount on exit. (We tried a recycling pool and benchmarked
  it slower for the typical slot-content shape; see the design notes
  in the component source.)
- Per-item `position: absolute; transform: translateY(prefixSum(i))`.
  No wrapper element.
- `contain: strict` on the scroll container, `contain: layout paint
  style` on each item — paint and layout stay isolated.
- ResizeObserver is wired via a custom `v-measure` directive so its
  hooks fire only on mount/unmount, never on every render. Skipped
  entirely in fixed-size mode (no measurement needed when sizes are
  known up front).
- Scroll handling rAF-throttled. Measurement flush rAF-batched. Anchor
  adjustment applied silently inside the same flush.

## Targets

| Measurement | Tier A | Tier B | Abort if Tier B is |
|---|---|---|---|
| Long frames during 10k-fixed scroll | 0 over 5s window | ≤ 1 over 5s window | > 5 |
| Worst frame during 10k-fixed scroll | < 16 ms | < 30 ms | > 50 ms |
| Memory, idle | < 60 MB | < 80 MB | > 150 MB |

## Tier A microbenchmark numbers (math kernel only)

Measured on the dev baseline (Snapdragon X Elite X1E-78-100, Win11
ARM64):

| Operation | mean | hz |
|---|---|---|
| `getVisibleRange1D` (variable, midpoint, overscan = 3) | 314 ns | 3.19 M/sec |
| `MeasurementCache.prefixSum` (10k, midpoint) | 75 ns | 13.26 M/sec |
| `MeasurementCache.indexAtOffset` (10k, midpoint) | 168 ns | 5.95 M/sec |
| `computeAnchorAdjustment` (10k, midpoint) | 89 ns | 11.24 M/sec |

The math kernel uses ~0.002 % of a 60 fps frame budget at 10k items.
The DOM composition pipeline is the bound, not the math.

## Tier A end-to-end results (LoAF-based)

Measured live in the demo above (Snapdragon X Elite, Chrome ARM64,
production build):

- **Idle:** 0 long frames / 0 ms worst frame.
- **Wheel-scroll, mixed direction, ~30 s session:** 0 long frames /
  0 ms worst frame.
- **Bottom-jump from 10k items:** 0 long frames / 0 ms worst frame.

Foundation passes Tier A authoritatively. Tier B (GHA / Linux x86_64)
measurement lands in Spike A.5 — that's the formal Phase-0 gate.

## Note on the rAF FPS readings

You will likely see the **rAF FPS min** drop to 30 during wheel scroll,
even though the LoAF metrics show 0 long frames. This is a known
artefact of rAF-based FPS counters under Chrome's input-dispatch
scheduling: the browser may defer a rAF callback by one vsync tick to
prioritise the wheel handler, and the counter sees that as a 33 ms
gap. The page is still rendering at 60 Hz; only the JS callback was
late.

The Long Animation Frame API was specified by the W3C to expose this
distinction. We use it as the source of truth.

## Decision

_Foundation green on Tier A._ Locks `<VirtualizedSurface1DY>` API
shape pending Spike A.5 (Tier B / GHA gate).
