/**
 * Image source factory. Lives in the main entry (no subpath needed) — an
 * `<img>` element is a browser primitive, no extra dependency to lazy-load.
 *
 * Usage:
 * ```ts
 * import { imageSource } from '@cocoar/vue-document-viewer';
 *
 * const source = imageSource({ url: '/attachments/diagram.png' });
 * ```
 *
 * Images are single-page documents with no selectable text, search, or
 * outline — the capabilities below drive the toolbar to disable those
 * tools (per the v2 lock: disabled-with-tooltip, not hidden). Print works
 * via the same iframe path PDFs use; the browser's built-in image viewer
 * handles the print dialog.
 */
import type {
  DocumentSource,
  ImageDocumentSource,
  ImageGalleryDocumentSource,
} from '../source-types';

export interface ImageSourceOptions {
  /** Image URL. Anything `<img src>` can handle: JPG, PNG, SVG, WebP, AVIF, GIF, blob:, data:. */
  url: string;
}

export function imageSource(opts: ImageSourceOptions): DocumentSource {
  const source: ImageDocumentSource = {
    kind: 'image',
    url: opts.url,
    capabilities: Object.freeze({
      // Single-page document — disables prev/next/page-input.
      multiPage: false,
      // Raster pixels carry no selectable text spans.
      textLayer: false,
      search: false,
      outline: false,
      // The native browser image viewer can print; we just hand it the URL via
      // a hidden iframe (same path PDFs use).
      print: true,
    }),
  };
  return Object.freeze(source);
}

export interface ImageGallerySourceOptions {
  /**
   * Image URLs, one per page. Order in the array = order in the document.
   * Mixing portrait + landscape pages is fine — each image carries its own
   * intrinsic dimensions.
   */
  urls: readonly string[];
}

/**
 * Multi-page image document. Use when an "attachment" is really a series of
 * scanned pages, photographed receipts, slide images, etc.
 *
 * ```ts
 * import { imageGallerySource } from '@cocoar/vue-document-viewer';
 *
 * const source = imageGallerySource({
 *   urls: ['/scans/page-1.jpg', '/scans/page-2.jpg', '/scans/page-3.jpg'],
 * });
 * ```
 *
 * Single-image case (`urls.length === 1`) works but is identical in effect
 * to `imageSource()` — prefer the latter when you know there's only one
 * image; it's the clearer expression of intent.
 */
export function imageGallerySource(opts: ImageGallerySourceOptions): DocumentSource {
  const source: ImageGalleryDocumentSource = {
    kind: 'image-gallery',
    // Freeze a copy so the consumer mutating their input array doesn't ripple
    // into the (frozen) source. `as readonly string[]` keeps the surface type
    // consistent with the interface.
    urls: Object.freeze([...opts.urls]) as readonly string[],
    capabilities: Object.freeze({
      multiPage: true,
      textLayer: false,
      search: false,
      outline: false,
      print: true,
    }),
  };
  return Object.freeze(source);
}
