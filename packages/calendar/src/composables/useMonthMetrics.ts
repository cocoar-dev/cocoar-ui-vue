/**
 * `useMonthMetrics` — measured cell metrics for the month view.
 *
 * The Details geometry (`useMonthGeometry`) needs the real height of
 * the day-number row, of a pill, of the "+N" row and the pill list's
 * gap / padding to size a row so `maxEventsPerCell` pills plus the
 * marker always fit. Hosts restyle these freely (`:deep()` overrides
 * on `.coar-month-cell__day-number-row`, `.coar-month-pill`, …), so
 * assuming the stylesheet's numbers clips the marker in any host with
 * a taller pill. This composable measures the rendered cells instead
 * and falls back to the stylesheet defaults while nothing is rendered
 * (first paint, empty months, test environments without layout).
 *
 * Re-measures on mount, once web fonts are ready, when `trigger`
 * changes (the parent passes its layout so a first pill / marker
 * appearing gets picked up) and whenever the root, the measured
 * day-number row, pill or marker resizes — a host stylesheet that
 * lands late, a font swap or a theme switch all reach the row height.
 */

import {
  type MaybeRefOrGetter,
  type Ref,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  toValue,
  watch,
} from 'vue';

export interface MonthMetrics {
  /** Height of `.coar-month-cell__day-number-row`. */
  dayNumberHeight: number;
  /** Height of one live single-day pill. */
  pillHeight: number;
  /** Height of the "+N" row. */
  markerHeight: number;
  /** `.coar-month-cell__pills` row gap and vertical padding. */
  pillGap: number;
  pillsPaddingTop: number;
  pillsPaddingBottom: number;
}

/** The stylesheet's numbers — what `CoarMonthCell` / `CoarMonthPill` render unstyled. */
export const DEFAULT_MONTH_METRICS: Readonly<MonthMetrics> = Object.freeze({
  dayNumberHeight: 24,
  pillHeight: 18,
  markerHeight: 18,
  pillGap: 2,
  pillsPaddingTop: 3,
  pillsPaddingBottom: 4,
});

export interface UseMonthMetricsOptions {
  /** Month view root — cells are queried inside it. */
  rootRef: Ref<HTMLElement | null>;
  /** Re-measure whenever this changes (typically the layout). */
  trigger?: MaybeRefOrGetter<unknown>;
}

const px = (value: string): number => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

/** The elements a measurement read, so they can be observed for resizes. */
export interface MonthMetricSources {
  dayRow: HTMLElement;
  pill: HTMLElement | null;
  marker: HTMLElement | null;
}

export function findMonthMetricSources(root: HTMLElement): MonthMetricSources | null {
  const dayRow = root.querySelector<HTMLElement>(
    '.coar-month-cell:not(.coar-month-cell--placeholder) .coar-month-cell__day-number-row',
  );
  if (!dayRow) return null;
  return {
    dayRow,
    pill: root.querySelector<HTMLElement>('.coar-month-cell__pills .coar-month-pill'),
    marker: root.querySelector<HTMLElement>('.coar-month-cell__overflow'),
  };
}

/** Measure the rendered cells; `null` when nothing measurable is in the DOM. */
export function measureMonthMetrics(root: HTMLElement): MonthMetrics | null {
  const sources = findMonthMetricSources(root);
  if (!sources || sources.dayRow.offsetHeight === 0) return null;
  const { dayRow, pill, marker } = sources;
  const pills = root.querySelector<HTMLElement>('.coar-month-cell__pills');
  const pillsStyle = pills ? getComputedStyle(pills) : null;
  const pillHeight = pill?.offsetHeight || DEFAULT_MONTH_METRICS.pillHeight;
  return {
    dayNumberHeight: dayRow.offsetHeight,
    pillHeight,
    markerHeight: marker?.offsetHeight || Math.max(pillHeight, DEFAULT_MONTH_METRICS.markerHeight),
    pillGap: pillsStyle
      ? px(pillsStyle.rowGap) || px(pillsStyle.gap)
      : DEFAULT_MONTH_METRICS.pillGap,
    pillsPaddingTop: pillsStyle ? px(pillsStyle.paddingTop) : DEFAULT_MONTH_METRICS.pillsPaddingTop,
    pillsPaddingBottom: pillsStyle
      ? px(pillsStyle.paddingBottom)
      : DEFAULT_MONTH_METRICS.pillsPaddingBottom,
  };
}

export function useMonthMetrics(opts: UseMonthMetricsOptions): Ref<MonthMetrics> {
  const metrics = ref<MonthMetrics>({ ...DEFAULT_MONTH_METRICS });

  function remeasure(): void {
    const root = opts.rootRef.value;
    if (!root) return;
    const next = measureMonthMetrics(root);
    if (!next) return;
    const cur = metrics.value;
    if (
      next.dayNumberHeight !== cur.dayNumberHeight ||
      next.pillHeight !== cur.pillHeight ||
      next.markerHeight !== cur.markerHeight ||
      next.pillGap !== cur.pillGap ||
      next.pillsPaddingTop !== cur.pillsPaddingTop ||
      next.pillsPaddingBottom !== cur.pillsPaddingBottom
    ) {
      metrics.value = next;
    }
  }

  let observer: ResizeObserver | null = null;
  const observed = new WeakSet<Element>();
  /** Observe the elements the last measurement read (idempotent). */
  function observeSources(): void {
    const root = opts.rootRef.value;
    if (!observer || !root) return;
    const sources = findMonthMetricSources(root);
    for (const el of [sources?.dayRow, sources?.pill, sources?.marker]) {
      if (el && !observed.has(el)) {
        observed.add(el);
        observer.observe(el);
      }
    }
  }
  function measureAndObserve(): void {
    remeasure();
    observeSources();
  }

  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined' && opts.rootRef.value) {
      observer = new ResizeObserver(() => remeasure());
      observer.observe(opts.rootRef.value);
    }
    measureAndObserve();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(measureAndObserve);
    }
  });
  onScopeDispose(() => observer?.disconnect());

  if (opts.trigger !== undefined) {
    watch(
      () => toValue(opts.trigger),
      () => {
        void nextTick(measureAndObserve);
      },
      { flush: 'post' },
    );
  }

  return metrics;
}
