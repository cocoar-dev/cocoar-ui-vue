/**
 * Image source adapter.
 *
 * Watches an `ImageDocumentSource` ref and turns it into a single-page
 * `PageProvider[]` that `usePageRenderer` consumes the same way it does for
 * PDFs — the toolbar, sidebar, and annotations all stay mounted across a
 * PDF↔image swap; only the inner page-renderer rebinds.
 *
 * Loading uses a plain `Image()`; a generation counter drops stale results
 * when the user switches sources quickly. Setting `img.src = ''` aborts the
 * in-flight fetch in all modern browsers.
 *
 * `crossOrigin` is intentionally left unset. Servers that don't send CORS
 * headers cause the load to fail entirely when `crossOrigin='anonymous'` is
 * set; without it, the image displays fine but the canvas becomes "tainted"
 * (no `toDataURL` etc.). Print uses an iframe → browser native viewer, not
 * canvas readback, so the tainted-canvas restriction is irrelevant.
 */
import {
  ref,
  shallowRef,
  watch,
  onBeforeUnmount,
  type Ref,
  type ShallowRef,
  type ComputedRef,
} from 'vue';
import type { DocumentInfo, ImageDocumentSource } from '../source-types';
import type { PageProvider } from '../internal/page-provider';
import type { DocumentStatus } from './pdf-adapter';

export interface ImageDocumentAdapterReturn {
  status: Ref<DocumentStatus>;
  pageProviders: ShallowRef<PageProvider[] | null>;
  info: ShallowRef<DocumentInfo | null>;
  error: Ref<unknown>;
  retry: () => void;
  destroy: () => Promise<void>;
}

/**
 * Best-effort image format inference from the URL. Recognized:
 *  - `data:image/<mime>;…` data URLs
 *  - file extensions on http(s) / blob: URLs
 *
 * Returns an upper-cased short label (`PNG`, `SVG`, …) suitable for
 * displaying after the kind in the Info panel. Falls back to `'Image'`
 * when the URL is opaque (e.g. an `<img>` proxy without a hint).
 */
export function inferImageFormat(url: string): string {
  if (url.startsWith('data:')) {
    const m = url.match(/^data:image\/([a-z0-9+.-]+)/i);
    if (m) {
      // svg+xml → SVG; jpeg → JPEG (left as-is rather than trimming to JPG).
      const t = m[1].toLowerCase();
      if (t === 'svg+xml') return 'SVG';
      return t.toUpperCase();
    }
    return 'Image';
  }
  try {
    const u = new URL(url, typeof location !== 'undefined' ? location.href : 'http://localhost/');
    const ext = u.pathname.split('.').pop()?.toLowerCase();
    if (ext && /^(jpg|jpeg|png|gif|webp|avif|svg|bmp|ico|tif|tiff)$/.test(ext)) {
      return ext.toUpperCase();
    }
  } catch {
    /* opaque URL — fall through */
  }
  return 'Image';
}

/**
 * Wrap a loaded `HTMLImageElement` in a single-page `PageProvider`.
 *
 * `render()` clears the canvas to white, then `drawImage`s the picture at the
 * requested scale, applying a `ctx.rotate` for non-zero rotations. Cancel is
 * a no-op because `drawImage` is synchronous — no in-flight work to abort.
 *
 * `getTextLayer` is omitted entirely so `usePageRenderer` skips creating the
 * `.textLayer` div (pdfjs's stylesheet would otherwise make it block clicks
 * on the image — see `page-provider.ts`).
 *
 * Exported so the image-gallery adapter can reuse the per-image draw path.
 */
export function createImagePageProvider(img: HTMLImageElement): PageProvider {
  return {
    intrinsicWidth: img.naturalWidth,
    intrinsicHeight: img.naturalHeight,

    async render(canvas, opts) {
      const intrinsicW = img.naturalWidth;
      const intrinsicH = img.naturalHeight;
      const rotated = opts.rotation === 90 || opts.rotation === 270;

      // Canvas raster (physical) dimensions are rotation-aware: a 90°-rotated
      // 100×200 image fills a 200×100 canvas.
      const rasterW = Math.floor((rotated ? intrinsicH : intrinsicW) * opts.scale * opts.dpr);
      const rasterH = Math.floor((rotated ? intrinsicW : intrinsicH) * opts.scale * opts.dpr);
      canvas.width = rasterW;
      canvas.height = rasterH;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rasterW, rasterH);

      // Drawn (unrotated) dimensions in physical pixels.
      const drawW = intrinsicW * opts.scale * opts.dpr;
      const drawH = intrinsicH * opts.scale * opts.dpr;

      ctx.save();
      // Position origin + rotate so that the unrotated drawImage call ends up
      // visually rotated. Canvas Y-axis points down, so positive radians look
      // clockwise on screen.
      switch (opts.rotation) {
        case 90:
          ctx.translate(rasterW, 0);
          ctx.rotate(Math.PI / 2);
          break;
        case 180:
          ctx.translate(rasterW, rasterH);
          ctx.rotate(Math.PI);
          break;
        case 270:
          ctx.translate(0, rasterH);
          ctx.rotate(-Math.PI / 2);
          break;
      }
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();
    },

    cancel() {
      // `drawImage` is synchronous — no in-flight work to abort.
    },

    // `getTextLayer` intentionally omitted: see file-level comment.
  };
}

export function useImageDocumentAdapter(
  sourceRef: ComputedRef<ImageDocumentSource | null>,
): ImageDocumentAdapterReturn {
  const status = ref<DocumentStatus>('idle');
  const pageProviders = shallowRef<PageProvider[] | null>(null);
  const info = shallowRef<DocumentInfo | null>(null);
  const error = ref<unknown>(null);

  /** Monotonic counter — each load bumps it; older results are dropped. */
  let generation = 0;
  let activeImg: HTMLImageElement | null = null;

  async function destroy(): Promise<void> {
    generation += 1;
    if (activeImg) {
      // Setting src='' aborts the in-flight fetch on all modern browsers.
      activeImg.onload = null;
      activeImg.onerror = null;
      activeImg.src = '';
      activeImg = null;
    }
    pageProviders.value = null;
    info.value = null;
    status.value = 'idle';
    error.value = null;
  }

  function loadFrom(source: ImageDocumentSource): void {
    void destroy().then(() => {
      const myGeneration = ++generation;
      status.value = 'loading';
      error.value = null;

      const img = new Image();
      activeImg = img;
      img.onload = () => {
        if (myGeneration !== generation) return; // stale
        pageProviders.value = [createImagePageProvider(img)];
        info.value = {
          kind: 'image',
          format: `Image · ${inferImageFormat(source.url)}`,
          pageCount: 1,
        };
        status.value = 'ready';
      };
      img.onerror = () => {
        if (myGeneration !== generation) return;
        status.value = 'error';
        // The `onerror` event has no useful payload — surface the URL so the
        // consumer can see what failed.
        error.value = new Error(`Failed to load image: ${source.url}`);
      };
      img.src = source.url;
    });
  }

  function retry(): void {
    const s = sourceRef.value;
    if (s) loadFrom(s);
  }

  watch(
    sourceRef,
    (source) => {
      if (source) loadFrom(source);
      else void destroy();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    void destroy();
  });

  return { status, pageProviders, info, error, retry, destroy };
}
