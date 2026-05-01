# Spike E — Worker-Recurrence Boundary

> **Status:** Closed. Auto-dispatch threshold locked at
> `rules.length ≥ 200`. Worker uses Transferable Float64Array for
> zero-copy occurrence transport.

## Question

What's the round-trip cost of dispatching recurrence expansion to a
worker, and at what occurrence count does the worker beat in-thread?

## Tier A bench results (Snapdragon X Elite, warm-path)

| Scenario | Rules | Occurrences | Sync (ms) | Async (ms) | Worker expand (ms) | Δ |
|---|---|---|---|---|---|---|
| W1 | 100 weekly × 1-week | 500 | **11.6** | 11.9 | 10.8 | +0.3 |
| W2 | 1.000 weekly × 1-week | 5.000 | **63.9** | 68.0 | 65.1 | +4.1 |
| W3 | 1.000 daily × 1-month | 30.001 | **68.1** | 71.5 | 68.3 | +3.4 |
| W4 | 10.000 weekly × 1-week | 50.000 | **562.2** | 619.4 | 577.0 | +57.2 |

Wall-clock winner is always sync — the worker pays postMessage +
Float64Array transfer that in-thread doesn't. **But wall-clock
isn't the right metric.**

## The right metric: frame budget

Sync time IS user-visible blocking time. A 16.67 ms frame budget
means anything that takes longer than ~ 16 ms freezes the UI for at
least one frame.

| Scenario | Sync (ms) | Frame-budget verdict |
|---|---|---|
| W1: 100 rules | 11.6 | OK in main thread |
| W2: 1.000 rules | 63.9 | Blocks ~ 4 frames — use worker |
| W3: 1.000 daily / month | 68.1 | Blocks ~ 4 frames — use worker |
| W4: 10.000 rules | 562.2 | Blocks ~ 34 frames — **must** use worker |

## Auto-dispatch threshold (locked)

```ts
if (request.rules.length >= 200) expandAsync(request);
else                              expandSync(request);
```

Why 200: comfortably above W1 (where sync still fits in one frame)
and well below W2 (where sync clearly blocks).

## Architecture

`packages/calendar/src/core/`:

- `recurrence.ts` — main-thread API (`expandSync` + `expandAsync`).
- `recurrenceWorker.ts` — runs in a dedicated worker, imports
  `rrule-rust`, returns occurrences as Float64Array buffers in the
  postMessage transferList (zero-copy).

The worker is created lazily and lives for the page lifetime;
cold-start ~ 175 ms (per Spike B), warm calls ~ 1-5 ms round-trip
plus the actual expansion.

## Live bench

Run the harness yourself at
[`/calendar-recurrence-worker`](http://localhost:5188/calendar-recurrence-worker)
in the playground.

## Full results write-up

See `.local/phase-0-spike-e-results.md` for the methodology, the
known dev-mode quirk, and the deferred items.
