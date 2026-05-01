# Calendar Spike — Phase 0

This is the staging area for `@cocoar/vue-calendar` Phase 0. Each spike below
validates one load-bearing architectural assumption with hard numbers on
real hardware before Phase 1 implementation begins.

> **Design doc:** `.local/cocoar-vue-calendar-v0.2.md`
> **Spike plan:** `.local/cocoar-vue-calendar-phase0-spike-plan.md`

## Status

Phase 0 — Day 1: skeleton up, spike pages stubbed. No measurements yet.

## Hardware tiers

All measurements report on three tiers:

| Tier | Hardware | Role |
|---|---|---|
| **A — Dev baseline** | Snapdragon X Elite X1E-78-100, Windows 11 ARM64 | Dashboard |
| **B — CI gate** | GitHub Actions `ubuntu-latest` | Performance budgets gate here |
| **C — Low-end target** | Mid-range Android tablet | Smoke test only |

## Spikes

| Spike | Question | Status |
|---|---|---|
| **A — Virtual Surface** | 60 fps Tier A / ≥ 50 fps Tier B with 10k items, recycling pool, transform-only positioning, anchor scroll restoration? | Stub |
| **B — RRULE Bake-off** | Is `rrule-rust` (WASM) viable as default engine vs. `rrule.js`? | Stub |
| **C — Multi-Day-Bar Layout** | Interval-graph coloring < 5 ms Tier A / < 20 ms Tier B for 200 events / week row? | Stub |
| **D — DnD + Auto-Scroll** | 60 fps drag Tier A / ≥ 50 fps Tier B with 200 events visible? | Stub |
| **E — Worker Recurrence** | Worker round-trip cost; at what occurrence count does it beat in-thread? | Stub |

## Phase 0 completion gate

Before Phase 1 starts, every spike produces a one-page write-up answering:

1. Did it hit Tier A and Tier B targets?
2. If not, which abort path was taken?
3. What architectural decision is now locked?

The five write-ups merge into `phase-0-results.md`.
