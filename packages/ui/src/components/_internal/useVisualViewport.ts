import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { keyboardInset } from './keyboardInset';

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
  nativeInset = 0,
): VisualViewportMetrics | null {
  if (viewport.scale > 1.01) return null;
  const bottomInset = Math.min(
    layoutHeight,
    Math.max(
      nativeInset,
      Math.max(0, Math.round(layoutHeight - viewport.height - viewport.offsetTop)),
    ),
  );
  return {
    height: Math.max(0, Math.min(viewport.height, layoutHeight - viewport.offsetTop - bottomInset)),
    bottomInset,
  };
}

/**
 * Follows `window.visualViewport` while the calling component is mounted. `metrics` stays
 * `null` during SSR, without a visual viewport or native inset, and while pinch-zoomed:
 * the caller then keeps its CSS-only layout.
 */
export function useVisualViewport(): { metrics: Ref<VisualViewportMetrics | null> } {
  const metrics = ref<VisualViewportMetrics | null>(null);
  let viewport: VisualViewport | null = null;
  let frame: HTMLElement | null = null;

  function update() {
    if (!frame) return;
    // Measure the frame fixed surfaces actually dock to: Safari panning, Chrome's
    // collapsing toolbar and classic scrollbars make innerHeight/clientHeight disagree.
    const layoutHeight = frame.offsetHeight;
    const next =
      viewport || keyboardInset.value > 0
        ? visualViewportMetrics(
            layoutHeight,
            viewport ?? {
              height: layoutHeight,
              offsetTop: 0,
              scale: 1,
            },
            keyboardInset.value,
          )
        : null;
    const current = metrics.value;
    if (next?.height === current?.height && next?.bottomInset === current?.bottomInset) return;
    metrics.value = next;
  }

  onMounted(() => {
    frame = document.createElement('div');
    frame.setAttribute('data-coar-viewport-frame', '');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText =
      'all: initial; position: fixed; inset: 0; visibility: hidden; pointer-events: none; contain: strict;';
    document.body.append(frame);
    viewport = typeof window !== 'undefined' ? (window.visualViewport ?? null) : null;
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();
  });
  watch(keyboardInset, update, { flush: 'sync' });

  onBeforeUnmount(() => {
    frame?.remove();
    frame = null;
    viewport?.removeEventListener('resize', update);
    viewport?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    viewport = null;
  });

  return { metrics };
}
