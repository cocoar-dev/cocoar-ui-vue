import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue';

/**
 * Canvas zoom for the builder.
 *
 * Scaling with `transform`, not the `zoom` property: `zoom` relayouts, so the
 * authored page would resolve its responsive rules against a different width
 * than the real viewport — an editor must not silently change the layout it is
 * showing. The cost is that a transform never affects the layout box, so the
 * scrollable area has to be re-derived from the content size.
 *
 * The content's own width is pinned to the viewport width it would have at
 * 100%. Without that pin the content would fill the scaled frame, whose size is
 * computed from the content — a feedback loop that collapses the canvas to a
 * couple of pixels.
 *
 * Pointer hit-testing needs no changes: the DnD engine works in client
 * coordinates throughout and `getBoundingClientRect()` already reports the
 * transformed rect.
 */
export const CANVAS_ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

const DEFAULT_ZOOM = 1;
const MIN_ZOOM = CANVAS_ZOOM_STEPS[0];
const MAX_ZOOM = CANVAS_ZOOM_STEPS[CANVAS_ZOOM_STEPS.length - 1];

export interface CanvasZoomOptions {
  /**
   * Pin the content to the viewport's width. Required whenever the content has
   * no intrinsic width — the editor canvas always, and the preview while its
   * frame is fluid (`width: 100%`). Without the pin, measuring a
   * percentage-width child to size its own parent feeds back and collapses it.
   * A frame with a simulated device width must NOT be pinned; it keeps its own.
   */
  pinToViewportWidth?: boolean | Ref<boolean>;
  /**
   * Overrides the pinned width, e.g. once the editor simulates a device width.
   * Ignored unless `pinToViewportWidth` is set.
   */
  pinnedWidth?: Ref<number | null | undefined>;
}

export function useCanvasZoom(
  viewportRef: Ref<HTMLElement | null>,
  contentRef: Ref<HTMLElement | null>,
  options: CanvasZoomOptions = {},
) {
  const pinWidth = computed(() => {
    const option = options.pinToViewportWidth ?? false;
    return typeof option === 'boolean' ? option : option.value;
  });
  const zoom = ref(DEFAULT_ZOOM);
  /** Layout width the content is pinned to — the viewport's content box. */
  const viewportWidth = ref<number | null>(null);
  const contentWidth = ref<number | null>(null);
  const contentHeight = ref<number | null>(null);
  /** The width the content is actually laid out at, whatever pins it. */
  const pinnedWidth = computed(() => {
    if (!pinWidth.value) return null;
    const override = options.pinnedWidth?.value;
    return override ?? viewportWidth.value;
  });
  const layoutWidth = computed(() => (pinWidth.value ? pinnedWidth.value : contentWidth.value));

  let viewportObserver: ResizeObserver | null = null;
  let contentObserver: ResizeObserver | null = null;

  function measureViewport() {
    const el = viewportRef.value;
    if (!el) return;
    const style = getComputedStyle(el);
    const inner = el.clientWidth
      - parseFloat(style.paddingLeft || '0')
      - parseFloat(style.paddingRight || '0');
    viewportWidth.value = inner > 0 ? inner : null;
  }

  function measureContent() {
    // offsetWidth/Height are pre-transform, i.e. the untouched layout size.
    const el = contentRef.value;
    contentWidth.value = el?.offsetWidth ?? null;
    contentHeight.value = el?.offsetHeight ?? null;
  }

  function observe(el: HTMLElement | null, onChange: () => void): ResizeObserver | null {
    if (!el || typeof ResizeObserver === 'undefined') return null;
    const observer = new ResizeObserver(() => onChange());
    observer.observe(el);
    onChange();
    return observer;
  }

  watch(viewportRef, (el) => {
    viewportObserver?.disconnect();
    viewportObserver = observe(el, measureViewport);
  }, { immediate: true });

  watch(contentRef, (el) => {
    contentObserver?.disconnect();
    contentObserver = observe(el, measureContent);
  }, { immediate: true });

  onBeforeUnmount(() => {
    viewportObserver?.disconnect();
    contentObserver?.disconnect();
    viewportObserver = contentObserver = null;
  });

  const contentStyle = computed(() => {
    const style: Record<string, string> = {};
    if (pinWidth.value && pinnedWidth.value != null) style.width = `${pinnedWidth.value}px`;
    if (zoom.value !== 1) {
      style.transform = `scale(${zoom.value})`;
      style.transformOrigin = 'top left';
    }
    return style;
  });

  /** Reserves the space the scaled content occupies, which a transform does not. */
  const frameStyle = computed(() => {
    if (zoom.value === 1 || layoutWidth.value === null || contentHeight.value === null) return {};
    return {
      width: `${layoutWidth.value * zoom.value}px`,
      height: `${contentHeight.value * zoom.value}px`,
    };
  });

  function setZoom(value: number) {
    zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }

  function step(direction: 1 | -1) {
    const index = CANVAS_ZOOM_STEPS.findIndex((s) => s >= zoom.value - 0.001);
    setZoom(direction > 0
      ? CANVAS_ZOOM_STEPS[Math.min(CANVAS_ZOOM_STEPS.length - 1, index + 1)]
      : CANVAS_ZOOM_STEPS[Math.max(0, index - 1)]);
  }

  function reset() {
    setZoom(DEFAULT_ZOOM);
  }

  return { zoom, setZoom, step, reset, contentStyle, frameStyle };
}
