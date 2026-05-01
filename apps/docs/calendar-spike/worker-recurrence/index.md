# Spike E — Worker-Recurrence Boundary

> **Status:** Stub (Phase 0, Day 1) — implementation lands as Spike E progresses.

## Question

What's the round-trip cost of dispatching recurrence expansion to a Worker,
and at what occurrence count does it beat in-thread?

## Approach

Two paths sharing a single API. Worker uses the engine selected by Spike B.
Structured-clone cost is the real measurement target.

```ts
export function expandSync(req: RecurrenceRequest): RecurrenceResponse
export async function expandAsync(req: RecurrenceRequest): Promise<RecurrenceResponse>
```

## Benchmark scenarios

| Scenario | Series | Window | Expected occurrences |
|---|---|---|---|
| **W1** | 100 weekly | 1 week | ~700 |
| **W2** | 1.000 weekly | 1 week | ~7.000 |
| **W3** | 1.000 daily | 1 month | ~30.000 |
| **W4** | 10.000 weekly | 1 week | ~70.000 |

## Targets

| Scenario | In-thread (Tier A / B) | Worker (Tier A / B) |
|---|---|---|
| W1 | < 5 ms / < 15 ms | irrelevant (worker overhead > saved time) |
| W2 | < 15 ms / < 50 ms | < 25 ms / < 80 ms |
| W3 | < 50 ms / < 150 ms | < 60 ms / < 180 ms |
| W4 | (don't run in-thread; UI freeze) | < 200 ms / < 600 ms |

## Results

_Pending implementation._

## Decision

_Pending results._ Locks the auto-dispatch threshold (currently
provisionally `seriesCount >= 500`).

Abort path: if structured-clone cost exceeds 30 ms for W4 payload, switch
to `Transferable` ArrayBuffers (encode occurrences as packed binary).
