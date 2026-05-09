# Performance baseline <Badge type="warning" text="Preview" />

The calendar's hot paths — virtualization, drag-and-drop with auto-scroll,
2D scrolling — were instrumented via the [Long Animation Frame API][loaf]
during development. This page records the numbers that justified the
architectural choices, plus the targets you should expect on real
hardware.

[loaf]: https://developer.mozilla.org/docs/Web/API/Performance_API/Long_animation_frame_timing

## How the numbers are measured

Two perf signals are reported throughout this page. They answer different
questions and have very different reliabilities:

| Metric | What it measures | Authoritative? |
|---|---|---|
| **Long frames (5 s window)** | Count of actual ≥ 50 ms frames over the last 5 s, from the browser's own pipeline (Long Animation Frame API). | **Yes.** Cannot be fooled by rAF scheduling. |
| **Worst frame (5 s window)** | Duration in ms of the longest frame in the last 5 s. | **Yes.** Same source. |
| **rAF FPS mean / min** | How often the JS `requestAnimationFrame` callback fires. | **No.** Chromium can defer rAF callbacks one or two vsync ticks during wheel-scroll input dispatch without producing visual jank — the rAF counter dips to 30 even on a smooth page. |

**Rule of thumb:** if Long-frames count is `0` and Worst-frame is under
50 ms, the page is genuinely smooth — regardless of what rAF FPS shows.

The Long Animation Frame API was specified by the W3C precisely to
expose the distinction; it is the source of truth in the numbers below.

## Targets

| Surface | Tier A (laptop / desktop) | Tier B (CI / cheap hardware) |
|---|---|---|
| **1D virtualization (≤ 10 000 fixed-size items)** | 0 long frames during wheel-scroll; worst frame < 16 ms | ≤ 1 long frame; worst frame < 30 ms |
| **1D virtualization (variable-size, 10 000 items)** | 0 long frames during wheel + measurement flushes | ≤ 2 long frames; worst frame < 30 ms |
| **2D virtualization (1 000 × 1 000 cells)** | 0 long frames during diagonal wheel-scroll | ≤ 2 long frames; worst frame < 30 ms |
| **Drag with auto-scroll (200-item list)** | 0 long frames over a 2.6 s scripted drag-and-hold session | ≤ 3 long frames; worst frame < 150 ms |
| **Memory (idle, 10 000 items)** | < 60 MB | < 80 MB |

## Validation results

Measured on a Snapdragon X Elite X1E-78-100 dev box (Windows 11 ARM64,
Chrome ARM64), production build, against the components shipped in
`@cocoar/vue-calendar`.

### 1D virtualization, 10 000 fixed-size items

| Scenario | Long frames | Worst frame |
|---|---|---|
| Idle | 0 | 0 ms |
| Wheel-scroll, mixed direction, ~ 30 s session | **0** | 0 ms |
| Bottom-jump from 10 000 items | **0** | 0 ms |

DOM cost: ≤ ~ 30 items mounted at any time. Bottom-jump still mounts
~ 14 items, never the full 10 000. Add / remove 1 000 items at runtime
updates the surface in place without remounting visible slots.

### 1D virtualization, 10 000 variable-size items

The variable-size path adds the `MeasurementCache` (Fenwick-tree-backed
prefix sums + interval search) and anchor-based scroll restoration.
Items mount with the `estimatedItemSize`, then `ResizeObserver` flushes
real heights inside one rAF.

| Scenario | Long frames | Worst frame |
|---|---|---|
| Wheel-scroll + first-paint measurement flushes | **0** | 0 ms |
| Manual size-toggle above the viewport (anchor restoration) | **0** | 0 ms |

### 2D virtualization, 1 000 × 1 000 cells

| Scenario | Long frames | Worst frame | Cells in DOM |
|---|---|---|---|
| 30 ticks at 50 ms cadence (≈ real wheel) | **0** | 0 ms | 378 |
| 50 ticks at 30 ms cadence (synthetic burst) | 1 | 50 ms | 357 |
| 1D-variable regression under the same regime | **0** | 0 ms | 10 |

The single long frame in the synthetic burst (~ twice the cadence of
natural wheel input) lands exactly on the 50 ms LoAF threshold. Real-
user wheel-scroll does not produce it. Adding 2D had no effect on the
1D path.

### Drag with auto-scroll (200-item list)

A scripted session via Chrome DevTools:

1. `pointerdown` on row 5
2. 30-step diagonal drag down to the bottom hot zone (~ 600 ms)
3. **Hold at bottom hot zone for 800 ms** — auto-scroll down fires each frame
4. 30-step reverse drag back up to the top hot zone (~ 600 ms)
5. **Hold at top hot zone for 600 ms** — auto-scroll up fires
6. `pointerup`

Total session ~ 2.6 s. `surface.scrollTop` ended at 231 px from a start
of 0 — auto-scroll is real, not simulated.

| Metric | Value |
|---|---|
| Long frames over the session | **0** |
| Worst frame | **0 ms** (under the 50 ms LoAF threshold) |

### Math kernel microbenchmarks

The pure-function primitives in `packages/calendar/src/core/`:

| Operation | mean | hz |
|---|---|---|
| `getVisibleRange1D` (variable, midpoint, overscan = 3) | 314 ns | 3.19 M / sec |
| `MeasurementCache.prefixSum` (10 k items, midpoint) | 75 ns | 13.26 M / sec |
| `MeasurementCache.indexAtOffset` (10 k items, midpoint) | 168 ns | 5.95 M / sec |
| `computeAnchorAdjustment` (10 k items, midpoint) | 89 ns | 11.24 M / sec |

The math kernel uses ≈ 0.002 % of a 60 fps frame budget at 10 k items.
The DOM composition pipeline is the bound, not the math.

## Architectural decisions the numbers locked in

- **Fenwick-tree variable-size cache.** `prefixSum` / `indexAtOffset` /
  `set` all in O(log n). Linear scans were measurably worse at 10 k+
  items in early prototypes; the tree paid for itself.
- **Transform-only positioning.** Items render at `transform: translate3d(0, y, 0)`
  rather than re-layouting on scroll. Composite-only updates per frame.
- **Keyed v-for over the visible range, no recycling pool.** Vue's
  diff turned out faster than a stable pool for typical slot content
  in benchmarks. Heavy custom renderers (charts, video) might benefit;
  the surface accepts a custom recycling pool when needed.
- **rAF-throttled drag.** Pointermove batches into a single rAF tick;
  multiple moves between frames coalesce. Auto-scroll velocity is
  computed in a pure function (`computeAutoScrollVelocity`) and
  applied to `scrollTop` / `scrollLeft` per tick.

## Known accessibility gap — drop announcements

The calendar ships full keyboard-driven drag (Tab to focus, arrow keys
to move, Shift + arrow to resize, Enter to confirm, Escape to cancel),
but **non-sighted users currently get no audible confirmation that a
drop landed.** Sighted users see the event jump to the new slot;
screen-reader users hear nothing.

This is a known gap, not by-design. An earlier internal implementation
had a polite-live-region announcement that read e.g.
`"Daily Standup moved to Monday, 15. Juni 2026, 09:00"` after each
drop. The plumbing was lost during a reactivity refactor (the shell-
level handler that prepended the announcement before forwarding to
`state.onEventDrop` was bypassed when sub-views started reading
`state.onEventDrop` directly per the C7 read-on-every-call contract),
and shipping it cleanly requires plumbing the announcer into the
single drop pipeline (`useCalendarDnd`) so every drop path —
mouse, touch, keyboard — surfaces it once.

Estimated effort: 1 – 2 h. Tracked as a post-launch a11y task.

Until then, consumers who need this can wire their own announcement
inside `onEventDrop`:

```ts
import { useA11yAnnouncer } from '@cocoar/vue-calendar';

const announcer = useA11yAnnouncer();
builder.onEventDrop(({ event, next }) => {
  const title = (event.meta as { title?: string })?.title ?? event.id;
  announcer.announce(`${title} moved to ${next.start.toString()}`);
  // …persist the change
});
```

## Reproduce locally

A manual smoke test surface ships with the playground:

```
pnpm --filter @cocoar/playground dev
# open http://localhost:5188/calendar-perf-bench
```

Pick `100 / 500 / 1 000 / 2 500` events from the segmented control,
drag, switch view, wheel-scroll. Generation-ms, in-data count, and
visible-window count are surfaced in the toolbar so you can sanity-check
the workload at a glance.

For automated perf gating (run the same scripted scenarios against a
production build under Playwright + Chromium DevTools), wire up your
own LoAF observer using the same approach documented in the
[Long Animation Frame API spec][loaf]. The patterns from this page
(scripted drag-and-hold, mixed-direction wheel, bottom-jump) are a good
starting fixture set.
