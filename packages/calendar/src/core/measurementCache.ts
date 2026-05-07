/**
 * Variable-size virtualization needs three operations on item sizes, all of
 * them in the hot path of every scroll frame:
 *
 *   1. `prefixSum(i)` — total pixels above item `i`
 *   2. `indexAtOffset(px)` — which item is at scroll offset `px`
 *   3. `set(i, size)` — update size of one item (e.g. on first measure)
 *
 * Naïve implementations are too slow at 10k items. A linear scan for prefix
 * sum is O(n); recomputing every frame burns the entire budget.
 *
 * The implementation here uses a **Binary Indexed Tree (Fenwick tree)** to
 * give all three ops in O(log n). The tree stores per-index *deltas from
 * the size estimate*, so an unmeasured cache is a tree of zeros — no
 * initialization pass needed at construction.
 *
 *   prefixSum(i)   = i * estimate + fenwickPrefixSum(i)
 *   set(i, size)   updates fenwick by (size - estimate) - oldDelta
 *   indexAtOffset  binary-searches over [0, count) using prefixSum
 *
 * For 10.000 items: each op is ≤ 14 fenwick steps × ≤ 14 binary-search
 * steps = ~200 array reads. Sub-microsecond on the dev baseline.
 *
 * The cache is intentionally framework-agnostic. Vue components own
 * `MeasurementCache` instances; they observe size changes via
 * `ResizeObserver` and call `set()` from within a batched rAF.
 */

export class MeasurementCache {
  /** Number of items represented in the cache. */
  private _itemCount: number;

  /** Estimated size used for any item that has not been measured. */
  private _estimatedSize: number;

  /**
   * Indices that have a measured (non-estimate) size, mapped to that size.
   * Used to compute the delta on re-measure and to answer `has()`.
   */
  private _measured: Map<number, number>;

  /**
   * Fenwick tree storing prefix sums of `(measured size - estimate)`. Index
   * 0 is unused per Fenwick convention; tree[i] covers a span ending at i.
   */
  private _fenwick: Float64Array;

  constructor(itemCount: number, estimatedSize: number) {
    if (itemCount < 0 || !Number.isFinite(itemCount)) {
      throw new RangeError(`itemCount must be a non-negative finite number, got ${itemCount}`);
    }
    if (estimatedSize <= 0 || !Number.isFinite(estimatedSize)) {
      throw new RangeError(`estimatedSize must be a positive finite number, got ${estimatedSize}`);
    }
    this._itemCount = Math.floor(itemCount);
    this._estimatedSize = estimatedSize;
    this._measured = new Map();
    this._fenwick = new Float64Array(this._itemCount + 1);
  }

  // ── Inspection ─────────────────────────────────────────────────────────

  get itemCount(): number {
    return this._itemCount;
  }

  get estimatedSize(): number {
    return this._estimatedSize;
  }

  get measuredCount(): number {
    return this._measured.size;
  }

  /** Returns true if `index` has a measured size (not just the estimate). */
  has(index: number): boolean {
    return this._measured.has(index);
  }

  /** Size at `index` — measured value if present, else estimate. */
  get(index: number): number {
    if (index < 0 || index >= this._itemCount) {
      throw new RangeError(`index ${index} out of range [0, ${this._itemCount})`);
    }
    return this._measured.get(index) ?? this._estimatedSize;
  }

  // ── Mutation ───────────────────────────────────────────────────────────

  /** Record a measured size for `index`. */
  set(index: number, size: number): void {
    if (index < 0 || index >= this._itemCount) {
      throw new RangeError(`index ${index} out of range [0, ${this._itemCount})`);
    }
    if (size < 0 || !Number.isFinite(size)) {
      throw new RangeError(`size must be a non-negative finite number, got ${size}`);
    }

    const oldDelta = this._measured.has(index)
      ? (this._measured.get(index) as number) - this._estimatedSize
      : 0;
    const newDelta = size - this._estimatedSize;
    const change = newDelta - oldDelta;
    this._measured.set(index, size);

    if (change !== 0) {
      let i = index + 1;
      while (i <= this._itemCount) {
        this._fenwick[i] += change;
        i += i & -i;
      }
    }
  }

  /** Drop a measured value, falling back to the estimate. */
  unset(index: number): void {
    if (index < 0 || index >= this._itemCount) {
      throw new RangeError(`index ${index} out of range [0, ${this._itemCount})`);
    }
    if (!this._measured.has(index)) return;
    const oldDelta = (this._measured.get(index) as number) - this._estimatedSize;
    this._measured.delete(index);

    if (oldDelta !== 0) {
      let i = index + 1;
      while (i <= this._itemCount) {
        this._fenwick[i] -= oldDelta;
        i += i & -i;
      }
    }
  }

  /** Drop everything; the cache reverts to all-estimates. */
  clear(): void {
    this._measured.clear();
    this._fenwick = new Float64Array(this._itemCount + 1);
  }

  /**
   * Change the item count. Existing measured indices that fall outside the
   * new range are dropped. The caller is responsible for re-keying after a
   * splice (inserting/removing in the middle invalidates indices above the
   * splice point and is not handled here — `clear()` and remeasure is the
   * supported path for that).
   */
  resize(newCount: number): void {
    if (newCount < 0 || !Number.isFinite(newCount)) {
      throw new RangeError(`newCount must be a non-negative finite number, got ${newCount}`);
    }
    const target = Math.floor(newCount);
    if (target === this._itemCount) return;

    // Capture current measurements; rebuild the fenwick tree.
    const next = new Map<number, number>();
    for (const [idx, size] of this._measured) {
      if (idx < target) next.set(idx, size);
    }

    this._itemCount = target;
    this._measured = next;
    this._fenwick = new Float64Array(target + 1);

    for (const [idx, size] of next) {
      const delta = size - this._estimatedSize;
      if (delta === 0) continue;
      let i = idx + 1;
      while (i <= target) {
        this._fenwick[i] += delta;
        i += i & -i;
      }
    }
  }

  // ── Queries (the hot path) ─────────────────────────────────────────────

  /**
   * Sum of sizes of items in `[0, index)`. Returns 0 for `index <= 0`.
   * Clamps `index > itemCount` to `itemCount`.
   *
   * O(log n).
   */
  prefixSum(index: number): number {
    if (index <= 0) return 0;
    const clamped = index >= this._itemCount ? this._itemCount : Math.floor(index);

    let delta = 0;
    let i = clamped;
    while (i > 0) {
      delta += this._fenwick[i];
      i -= i & -i;
    }
    return clamped * this._estimatedSize + delta;
  }

  /** Total size = `prefixSum(itemCount)`. O(log n). */
  totalSize(): number {
    return this.prefixSum(this._itemCount);
  }

  /**
   * Smallest `i` such that `prefixSum(i + 1) > offset`. In other words:
   * which item contains the pixel at `offset`?
   *
   * Returns 0 for `offset <= 0`. Returns `itemCount - 1` if offset is at or
   * past the end (and `itemCount > 0`). Returns 0 if `itemCount === 0`.
   *
   * O(log² n) via binary search over `prefixSum`. Could be reduced to
   * O(log n) with a Fenwick descent, but log² × log = ~200 reads at 10k
   * items, dwarfed by the surrounding work. We keep the simpler form.
   */
  indexAtOffset(offset: number): number {
    if (this._itemCount === 0) return 0;
    if (offset <= 0) return 0;

    // Binary search for the smallest `i` in [0, itemCount) such that
    // prefixSum(i + 1) > offset.
    let lo = 0;
    let hi = this._itemCount;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.prefixSum(mid + 1) <= offset) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo >= this._itemCount ? this._itemCount - 1 : lo;
  }
}
