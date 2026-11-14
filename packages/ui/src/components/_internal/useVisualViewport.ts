import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/** What a surface docked to the bottom needs to know about the visual viewport. */
export interface VisualViewportMetrics {
  /** Height of the visible part of the page in px. */
  readonly height: number;
  /**
   * Distance in px from the bottom of the layout viewport (what `position: fixed;
   * bottom: 0` docks to) up to the bottom of the visible part: the on-screen keyboard,
   * or the part of the page that iOS panned away.
   */
  readonly bottomInset: number;
}

/**
 * Metrics of a visual viewport, or `null` while it is pinch-zoomed: zoomed, the layout
 * viewport is the right frame and following the visual one would shrink the surface.
 */
export function visualViewportMetrics(
  layoutHeight: number,
  viewport: Pick<VisualViewport, 'height' | 'offsetTop' | 'scale'>,
): VisualViewportMetrics | null {
  if (viewport.scale > 1.01) return null;
  return {
    height: viewport.height,
    bottomInset: Math.max(0, Math.round(layoutHeight - viewport.height - viewport.offsetTop)),
  };
}

/**
 * Follows `window.visualViewport` while the calling component is mounted. `metrics` stays
 * `null` during SSR, where the browser has no visual viewport (happy-dom, old browsers),
 * and while the page is pinch-zoomed: the caller then keeps its CSS-only layout.
 */
export function useVisualViewport(): { metrics: Ref<VisualViewportMetrics | null> } {
  const metrics = ref<VisualViewportMetrics | null>(null);
  let viewport: VisualViewport | null = null;

  function update() {
    if (!viewport) return;
    const next = visualViewportMetrics(window.innerHeight, viewport);
    const current = metrics.value;
    if (next?.height === current?.height && next?.bottomInset === current?.bottomInset) return;
    metrics.value = next;
  }

  onMounted(() => {
    viewport = typeof window !== 'undefined' ? (window.visualViewport ?? null) : null;
    if (!viewport) return;
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    update();
  });

  onBeforeUnmount(() => {
    viewport?.removeEventListener('resize', update);
    viewport?.removeEventListener('scroll', update);
    viewport = null;
  });

  return { metrics };
}
