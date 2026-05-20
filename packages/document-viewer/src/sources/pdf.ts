/**
 * PDF source factory. Lives at the `/pdf` subpath export so consumers that
 * only render images don't pull `pdfjs-dist` into their bundle.
 *
 * Usage:
 * ```ts
 * import { pdfSource } from '@cocoar/vue-document-viewer/pdf';
 *
 * const source = pdfSource({ url: '/files/doc.pdf' });
 * ```
 *
 * The returned `DocumentSource` is a plain (frozen) object — consumers
 * don't need to dispose anything. Recreating it on URL change is the
 * intended flow (`computed(() => pdfSource({ url: currentUrl.value }))`).
 */
import type { DocumentSource, PdfDocumentSource } from '../source-types';

export interface PdfSourceOptions {
  /** PDF URL. Relative or absolute; CORS rules apply. */
  url: string;
  /**
   * Extra HTTP headers forwarded to pdfjs's request. Common case: bearer
   * tokens for authenticated endpoints.
   */
  headers?: Record<string, string>;
  /**
   * Whether to send cookies / HTTP auth with the fetch. Default `true` —
   * the common Cocoar case is a same-origin cookie-authenticated endpoint.
   * Set false for public cross-origin PDFs served with
   * `Access-Control-Allow-Origin: *` (wildcards reject credentials).
   */
  withCredentials?: boolean;
}

export function pdfSource(opts: PdfSourceOptions): DocumentSource {
  const source: PdfDocumentSource = {
    kind: 'pdf',
    url: opts.url,
    headers: Object.freeze({ ...(opts.headers ?? {}) }),
    withCredentials: opts.withCredentials ?? true,
    capabilities: Object.freeze({
      multiPage: true,
      textLayer: true,
      search: true,
      outline: true,
      print: true,
    }),
  };
  return Object.freeze(source);
}

// Re-export the union + capabilities type so consumers importing from /pdf
// don't need a second import for the shared types.
export type { DocumentSource, DocumentSourceCapabilities, PdfDocumentSource } from '../source-types';
