/**
 * Public engine interface for recurrence expansion (Phase 4 §A5).
 *
 * Engines implement `RecurrenceEngine`; consumers can replace the
 * default engine via `builder.recurrenceEngine(custom)` or by
 * passing a 4th arg to `expandSeries(...)`. The contract
 * intentionally stays small and stable: the lib does the heavy
 * lifting (RecurringSeries → EngineSeries conversion, source-zone
 * preservation, DstPolicy post-processing, provenance) so engines
 * focus only on RRULE expansion.
 *
 * One engine adapter ships in-tree:
 *   - `@cocoar/vue-calendar/recurrence-rrule-temporal` — pure JS,
 *     Temporal-native, the lazy default.
 *
 * Custom engines (e.g. WASM-backed for high-volume workloads,
 * server-side delegation, or test mocks) implement `RecurrenceEngine`
 * in consumer code and register via `builder.recurrenceEngine(...)`.
 *
 * **Wire format invariants**
 *   - All times travel as numeric components (year/month/day/hour
 *     /minute/second). No `Date`, no `Temporal` objects in the wire —
 *     so Worker postMessage stays cheap and structured-clone friendly.
 *   - Source zones travel per-endpoint (DTSTART, each RDATE, each
 *     EXDATE). The library NEVER collapses to one zone before calling
 *     the engine — C3.
 *   - Output `timestamps` are unix-ms (UTC instants). The library
 *     reconstructs each occurrence's `Temporal.ZonedDateTime` in its
 *     source zone using the parallel `seriesTzid` + `occurrenceTzids`
 *     fields — no zone identity is lost.
 *   - All-day series travel through a separate `kind: 'allDay'`
 *     branch with packed `Int32Array` dates. No instants exist for
 *     all-day events (Article 4) so `timestamps` would be a category
 *     error.
 */

// ─── Engine input — RecurringSeries lifted to wire-friendly shape ────

/**
 * Components of a wallclock time. Used for DTSTART, RDATE, EXDATE,
 * and the `UNTIL` field of an RRULE in the timed path. Plain numbers
 * so the structure clones cheaply across the worker boundary.
 */
export interface WallclockTimed {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number;   // 1-31
  readonly hour: number;  // 0-23
  readonly minute: number; // 0-59
  readonly second: number; // 0-59
  readonly tzid: string;   // IANA, e.g. "Europe/Vienna"
}

/**
 * Components of a wallclock date (no time, no zone). Used for
 * DTSTART, RDATE, EXDATE, and `UNTIL` of an RRULE in the all-day
 * path. Article 4: a date is not a point in time.
 */
export interface WallclockDate {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number;   // 1-31
}

/**
 * RFC-5545 RRULE in string form, e.g. `'FREQ=WEEKLY;BYDAY=MO,WE,FR'`.
 *
 * Stored as a string because:
 *   - Engines parse RRULE natively; pre-parsing into a structured
 *     form would require us to re-emit RFC-compliant syntax for any
 *     engine using a typed constructor.
 *   - Adding a structured representation here would lock the lib
 *     into a specific RRULE-feature subset; the string form lets
 *     each engine accept whatever RFC features it supports natively.
 *
 * The optional `until` is split out so the lib can pass it as a
 * properly-typed value (matching DTSTART's value class) instead of
 * embedding it in the string.
 */
export interface RuleSpec {
  readonly rrule: string;
  /**
   * Optional override for `UNTIL` from the rrule string. When set,
   * adapters use this typed value instead of parsing the embedded
   * `UNTIL` from the string. Lets the lib enforce value-class
   * matching with DTSTART (per A6).
   */
  readonly until?: WallclockTimed | WallclockDate;
}

/**
 * Engine-side representation of a `RecurringSeries`.
 *
 * Discriminated by `kind` so timed and all-day series travel through
 * separate code paths inside the engine — no synthetic 00:00 in a
 * zone (per A6).
 */
export type EngineSeries =
  | EngineSeriesTimed
  | EngineSeriesAllDay;

export interface EngineSeriesTimed {
  readonly seriesId: string;
  readonly kind: 'timed';
  readonly dtstart: WallclockTimed;
  readonly rules: readonly RuleSpec[];
  readonly rdates: readonly WallclockTimed[];
  readonly exdates: readonly WallclockTimed[];
}

export interface EngineSeriesAllDay {
  readonly seriesId: string;
  readonly kind: 'allDay';
  readonly dtstart: WallclockDate;
  readonly rules: readonly RuleSpec[];
  readonly rdates: readonly WallclockDate[];
  readonly exdates: readonly WallclockDate[];
}

// ─── Engine request / response (batched) ──────────────────────────────

/**
 * Window for the engine call. Bounds are absolute instants (unix-ms);
 * the engine clips occurrences to `[start, end)`. Inclusive-start /
 * exclusive-end (same convention as `RecurrenceExpansionWindow` and
 * `ViewWindow`).
 *
 * For all-day series the lib still passes instants — the engine
 * computes the date-only window by taking each date's UTC-midnight
 * instant. The bounds are wide enough that DST near the edge can't
 * flip an occurrence out of the window.
 */
export interface EngineWindow {
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * Batched engine request. The library collects all visible series,
 * dispatches once. Engines that can parallelize (worker-backed) get
 * the most leverage from large batches.
 */
export interface EngineRequest {
  readonly window: EngineWindow;
  readonly series: readonly EngineSeries[];
}

// ─── Engine output ────────────────────────────────────────────────────

/**
 * Origin marker for one occurrence. Packed into a `Uint8Array` per
 * series-result for transferable round-trip. Used by Step 3 to set
 * `__recurrence.source` on each `CalendarEvent`.
 */
export const ORIGIN_RRULE = 0;
export const ORIGIN_RDATE = 1;
export type OriginCode = typeof ORIGIN_RRULE | typeof ORIGIN_RDATE;

/**
 * Engine result — discriminated union mirroring `EngineSeries.kind`.
 *
 * `Float64Array` / `Int32Array` / `Uint16Array` / `Uint8Array` are
 * all Transferable; the worker round-trip stays zero-copy.
 */
export type EngineResult =
  | EngineResultTimed
  | EngineResultAllDay;

export interface EngineResultTimed {
  readonly seriesId: string;
  readonly kind: 'timed';
  /** Unix-ms instants of every occurrence inside the window. */
  readonly timestamps: Float64Array;
  /**
   * The series source zone (matches `EngineSeriesTimed.dtstart.tzid`).
   * Set unconditionally so the library can reconstruct
   * `Temporal.ZonedDateTime` for rule-generated occurrences without
   * looking elsewhere.
   */
  readonly seriesTzid: string;
  /**
   * Per-occurrence zone overrides — used only when at least one
   * RDATE has a different `tzid` than `seriesTzid`. When present,
   * `indices[i]` is the index into `pool` for the i-th occurrence.
   * When omitted, every occurrence uses `seriesTzid`.
   *
   * Hot-path optimization (A1 fast-path): the homogeneous-zone case
   * pays no extra bytes.
   */
  readonly occurrenceTzids?: {
    readonly pool: readonly string[];
    readonly indices: Uint16Array;
  };
  /**
   * One byte per occurrence — `ORIGIN_RRULE` or `ORIGIN_RDATE`. Step
   * 3 uses this to populate `__recurrence.source`.
   */
  readonly origins: Uint8Array;
}

export interface EngineResultAllDay {
  readonly seriesId: string;
  readonly kind: 'allDay';
  /**
   * Packed dates: each entry is `(year * 512 + month * 32 + day)`.
   * Decoded by the library into `Temporal.PlainDate`.
   *
   * Why packed: instants don't exist for all-day events (Article 4),
   * but a numeric encoding still rides the transferable fast-path.
   * The `512 * 32` packing fits 11 bits of year + 4 bits of month +
   * 5 bits of day in 20 bits — well inside Int32.
   */
  readonly dates: Int32Array;
  readonly origins: Uint8Array;
}

/**
 * Batched engine response — one result per input series, in the same
 * order. Errors are surfaced per-series so a single bad rule doesn't
 * fail the whole batch.
 */
export interface EngineResponse {
  readonly results: readonly EngineResult[];
  /**
   * Per-series errors. Empty on full success. When non-empty, the
   * corresponding entry in `results` may be missing (engines may
   * skip failed series rather than emitting an empty result).
   */
  readonly errors: readonly EngineSeriesError[];
}

export interface EngineSeriesError {
  readonly seriesId: string;
  readonly message: string;
}

// ─── Engine contract ──────────────────────────────────────────────────

/**
 * Recurrence engine contract.
 *
 * Implementations parse + expand RRULE/RDATE/EXDATE for a batch of
 * series over a window. The library does NOT expect the engine to
 * apply `DstPolicy` — that's post-processing in `dst-resolve.ts`
 * (Step 3) so engine-swap never changes observable semantics.
 *
 * The interface is `async` so worker-backed engines fit the same
 * shape as in-thread engines. Consumers always `await`.
 *
 * **Engine implementer responsibilities:**
 *   - Use the `series.dtstart.tzid` (or per-RDATE/EXDATE `tzid`) for
 *     wallclock interpretation. Never collapse to one zone.
 *   - For timed `EngineResultTimed`: emit `timestamps` as unix-ms
 *     UTC instants, and populate `seriesTzid` + optional
 *     `occurrenceTzids` so the lib can reconstruct ZDTs in the
 *     correct zone per occurrence.
 *   - For all-day `EngineResultAllDay`: emit packed `dates`. Never
 *     pass through an `Instant` for all-day series (Article 4).
 *   - EXDATE matching: against the series source zone (A7).
 *   - `origins`: set `ORIGIN_RRULE` for rule-generated occurrences
 *     and `ORIGIN_RDATE` for occurrences originating from an RDATE.
 *
 * **What engines MUST NOT do:**
 *   - Apply `DstPolicy` — that's the lib's job (Step 3).
 *   - Add `meta.__recurrence` provenance — that's the lib's job
 *     (Step 3).
 *   - Reorder occurrences inside one series-result. Within each
 *     `EngineResult.timestamps` (or `dates`), occurrences must be
 *     sorted ascending. The lib relies on this.
 */
export interface RecurrenceEngine {
  /**
   * Expand a batch of recurring series over a window.
   * Always async. Consumers await regardless of whether the engine
   * is in-thread or worker-backed.
   */
  expand(request: EngineRequest): Promise<EngineResponse>;
}
