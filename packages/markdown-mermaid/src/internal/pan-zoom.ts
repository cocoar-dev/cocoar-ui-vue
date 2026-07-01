/**
 * Minimal, dependency-free pan + zoom for a rendered diagram.
 *
 * Deliberately does NOT hijack the plain mouse wheel — that would trap page
 * scrolling ("I scroll and get stuck on the diagram"). Instead:
 *   - plain wheel  → the page scrolls normally (we don't touch it),
 *   - Ctrl/⌘ + wheel → zoom toward the cursor,
 *   - the +/−/reset controls (driven by {@link PanZoomHandle}) → zoom, and
 *   - mouse / pen drag → pan.
 * Touch is intentionally left to the browser (one-finger touch scrolls the page),
 * so a diagram never blocks scrolling on a tablet — zoom there is via the buttons.
 *
 * The caller owns the DOM: it passes the clipping `viewport` (overflow hidden)
 * and the `content` wrapper (the element holding Mermaid's SVG). A CSS transform
 * on `content` is all that's needed — no d3 / svg-pan-zoom.
 */

export interface PanZoomHandle {
  /** Zoom in one step, toward the viewport center. */
  zoomIn(): void;
  /** Zoom out one step, from the viewport center. */
  zoomOut(): void;
  /** Recenter + reset zoom to 1. */
  reset(): void;
  /** Remove every listener. Idempotent. */
  destroy(): void;
}

export interface PanZoomOptions {
  minScale?: number;
  maxScale?: number;
  /** Ctrl/⌘+wheel sensitivity; larger = faster zoom. */
  zoomSpeed?: number;
  /** Multiplier applied by the +/− buttons per click. */
  step?: number;
}

export function createPanZoom(
  viewport: HTMLElement,
  content: HTMLElement,
  options: PanZoomOptions = {},
): PanZoomHandle {
  const minScale = options.minScale ?? 0.3;
  const maxScale = options.maxScale ?? 8;
  const zoomSpeed = options.zoomSpeed ?? 0.0015;
  const step = options.step ?? 1.25;

  let scale = 1;
  let tx = 0;
  let ty = 0;

  let panning = false;
  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let startTx = 0;
  let startTy = 0;

  content.style.transformOrigin = '0 0';
  const apply = (): void => {
    content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  // Zoom keeping the point (px, py) — in viewport coordinates — visually fixed.
  const zoomAt = (px: number, py: number, factor: number): void => {
    const next = clamp(scale * factor, minScale, maxScale);
    const k = next / scale;
    tx = px - k * (px - tx);
    ty = py - k * (py - ty);
    scale = next;
    apply();
  };

  const zoomCenter = (factor: number): void => {
    const rect = viewport.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, factor);
  };

  const onWheel = (e: WheelEvent): void => {
    // Only zoom with a modifier — otherwise let the wheel scroll the page.
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * zoomSpeed));
  };

  const onPointerDown = (e: PointerEvent): void => {
    // Left mouse / pen only — leave touch to the browser so the page can scroll.
    if (e.button !== 0 || e.pointerType === 'touch') return;
    panning = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startTx = tx;
    startTy = ty;
    viewport.setPointerCapture(pointerId);
    viewport.classList.add('is-panning');
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!panning) return;
    tx = startTx + (e.clientX - startX);
    ty = startTy + (e.clientY - startY);
    apply();
  };

  const endPan = (): void => {
    if (!panning) return;
    panning = false;
    try {
      viewport.releasePointerCapture(pointerId);
    } catch {
      // capture already gone — ignore
    }
    viewport.classList.remove('is-panning');
  };

  // Center the (untransformed) content in the viewport at scale 1. Without this a
  // short/wide diagram (e.g. a Gantt) sits at the top of a taller viewport, so
  // zooming toward the viewport center pushes it out of view.
  const reset = (): void => {
    scale = 1;
    const prev = content.style.transform;
    content.style.transform = 'none';
    const vp = viewport.getBoundingClientRect();
    const c = content.getBoundingClientRect();
    content.style.transform = prev;
    tx = Math.max(0, (vp.width - c.width) / 2);
    ty = Math.max(0, (vp.height - c.height) / 2);
    apply();
  };

  viewport.addEventListener('wheel', onWheel, { passive: false });
  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', endPan);
  viewport.addEventListener('pointercancel', endPan);
  viewport.addEventListener('dblclick', reset);

  reset();

  return {
    zoomIn: () => zoomCenter(step),
    zoomOut: () => zoomCenter(1 / step),
    reset,
    destroy(): void {
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', endPan);
      viewport.removeEventListener('pointercancel', endPan);
      viewport.removeEventListener('dblclick', reset);
    },
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
