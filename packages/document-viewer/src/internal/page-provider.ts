/**
 * Source-agnostic per-page renderer.
 *
 * `PageProvider` is the seam between `usePageRenderer` (which owns the canvas
 * DOM + lazy IntersectionObserver pipeline) and the underlying document format
 * (PDF via pdfjs, raster image via `<img>` + `drawImage`, future kinds…).
 *
 * Providers own their own cancel bookkeeping — `usePageRenderer` no longer
 * tracks per-page render tasks; it just calls `render()` again and the
 * provider invalidates whatever was in flight. This keeps the format-specific
 * cancel idioms (pdfjs `RenderTask.cancel()`, browser `AbortController`)
 * inside the adapter rather than leaking into the renderer.
 *
 * `getTextLayer` is **optional**: image sources omit it (raster pixels have
 * no selectable text). When omitted, `usePageRenderer` skips creating the
 * `.textLayer` container entirely — important, because pdfjs' stylesheet
 * gives an empty `.textLayer` `pointer-events: auto`, which would otherwise
 * eat clicks on images.
 */

import { TextLayer } from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist';

export type PageRotation = 0 | 90 | 180 | 270;

export interface PageRenderOptions {
  /** CSS-pixel scale (1 = 100%). */
  scale: number;
  rotation: PageRotation;
  /** Device-pixel-ratio multiplier applied to the raster canvas only. */
  dpr: number;
}

export interface TextLayerOptions {
  scale: number;
  rotation: PageRotation;
}

export interface TextLayerInstance {
  cancel(): void;
}

export interface PageProvider {
  readonly intrinsicWidth: number;
  readonly intrinsicHeight: number;
  /**
   * Rasterize this page into the given canvas. The provider sets the canvas's
   * `width`/`height` (raster pixels) — the caller owns CSS sizing via `style`.
   * Resolves when the raster lands; rejects with a cancel-typed error if a
   * later call (or `cancel()`) preempts this one.
   */
  render(canvas: HTMLCanvasElement, opts: PageRenderOptions): Promise<void>;
  /** Cancel any in-flight `render()` or `getTextLayer()` for this page. */
  cancel(): void;
  /**
   * Optional: populate `container` with positioned text spans for native
   * selection + Ctrl+C copy. Provider owns clearing the container's previous
   * contents before adding new spans.
   */
  getTextLayer?(container: HTMLDivElement, opts: TextLayerOptions): Promise<TextLayerInstance>;
}

/** Common pdfjs cancel error names + the browser `AbortError`. */
export function isCancelError(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  return name === 'RenderingCancelledException' || name === 'AbortException' || name === 'AbortError';
}

/**
 * Wrap a pdfjs `PDFPageProxy` in a `PageProvider`. The provider holds the
 * active `RenderTask`s (keyed by target canvas) + `TextLayer`.
 *
 * **Per-canvas render tracking** matters here because a single provider can
 * be asked to render to multiple canvases concurrently — typically the main
 * viewport's big canvas and the sidebar's thumbnail canvas, both bound to
 * the same logical page. Cancelling globally on each `render()` call would
 * leave the loser's canvas at the default opaque-black state of a
 * `{ alpha: false }` 2D context. So we cancel only the prior render that
 * targeted *this* canvas; renders to other canvases keep running.
 */
export function createPdfPageProvider(proxy: PDFPageProxy): PageProvider {
  // Base viewport at scale=1/rotation=0 — pdfjs uses these as intrinsic dims.
  const base = proxy.getViewport({ scale: 1, rotation: 0 });

  const activeRenders = new Map<HTMLCanvasElement, ReturnType<PDFPageProxy['render']>>();
  let activeTextLayer: TextLayer | null = null;

  function cancelRenderFor(canvas: HTMLCanvasElement) {
    const prev = activeRenders.get(canvas);
    if (!prev) return;
    try {
      prev.cancel();
    } catch {
      /* noop — already settled */
    }
    activeRenders.delete(canvas);
  }

  function cancelAllRenders() {
    for (const task of activeRenders.values()) {
      try {
        task.cancel();
      } catch {
        /* noop */
      }
    }
    activeRenders.clear();
  }

  function cancelTextLayer() {
    if (!activeTextLayer) return;
    try {
      activeTextLayer.cancel();
    } catch {
      /* noop */
    }
    activeTextLayer = null;
  }

  return {
    intrinsicWidth: base.width,
    intrinsicHeight: base.height,

    async render(canvas, opts) {
      // Only cancel the prior render that targeted THIS canvas — leave concurrent
      // renders to other canvases (e.g. sidebar thumbnails) alone.
      cancelRenderFor(canvas);

      const viewport = proxy.getViewport({
        scale: opts.scale * opts.dpr,
        rotation: opts.rotation,
      });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const task = proxy.render({ canvasContext: ctx, viewport, canvas });
      activeRenders.set(canvas, task);
      try {
        await task.promise;
      } finally {
        if (activeRenders.get(canvas) === task) activeRenders.delete(canvas);
      }
    },

    cancel() {
      cancelAllRenders();
      cancelTextLayer();
    },

    async getTextLayer(container, opts) {
      cancelTextLayer();

      const viewport = proxy.getViewport({ scale: opts.scale, rotation: opts.rotation });

      // Always rebuild the spans — TextLayer appends on render, so reusing the
      // DOM across scales would stack duplicates.
      container.replaceChildren();

      const textContent = await proxy.getTextContent();
      const layer = new TextLayer({ textContentSource: textContent, container, viewport });
      activeTextLayer = layer;
      await layer.render();

      return {
        cancel() {
          try {
            layer.cancel();
          } catch {
            /* noop */
          }
          if (activeTextLayer === layer) activeTextLayer = null;
        },
      };
    },
  };
}
