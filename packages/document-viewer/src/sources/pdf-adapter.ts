/**
 * PDF source adapter.
 *
 * Watches a `PdfDocumentSource` ref and turns it into a `PageProvider[]` that
 * `usePageRenderer` can render in a source-agnostic way. Owns:
 *  - the pdfjs `LoadingTask` lifecycle (cancel + destroy on source change),
 *  - the `PDFDocumentProxy` (exposed as `pdfDoc` for PDF-only consumers —
 *    `DocumentSidebar` reads `getOutline()`, `usePdfSearch` reads `getTextContent()`),
 *  - per-page `PageProvider` materialization (one `getPage` + one
 *    `createPdfPageProvider` per page).
 *
 * A monotonic `generation` counter drops results from older loads — when the
 * user switches PDFs fast, the in-flight load that resolves after a newer one
 * cleans itself up and never publishes its result.
 */
import { ref, shallowRef, watch, onBeforeUnmount, type Ref, type ShallowRef, type ComputedRef } from 'vue';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DocumentInfo, PdfDocumentSource, PdfMetadata } from '../source-types';
import { createPdfPageProvider, type PageProvider } from '../internal/page-provider';

export type DocumentStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PdfDocumentAdapterReturn {
  status: Ref<DocumentStatus>;
  /** The pdfjs document — kept as a PDF-only escape hatch for sidebar + search. */
  pdfDoc: ShallowRef<PDFDocumentProxy | null>;
  /** Source-agnostic page providers consumed by `usePageRenderer`. */
  pageProviders: ShallowRef<PageProvider[] | null>;
  /** Source-level metadata — null until the document is ready. */
  info: ShallowRef<DocumentInfo | null>;
  error: Ref<unknown>;
  /** Reload the current source. No-op when source is null. */
  retry: () => void;
  /** Tear down the loaded document + cancel any in-flight load. */
  destroy: () => Promise<void>;
}

/**
 * Parse a PDF date string (`D:YYYYMMDDHHmmSS+HH'mm'`) into a human-readable
 * ISO-ish form. Returns the raw string when the format isn't recognized so
 * the field is still surfaced rather than silently dropped.
 */
export function parsePdfDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) return raw;
  const [, y, mo, d, h = '00', mi = '00', se = '00'] = match;
  return `${y}-${mo}-${d} ${h}:${mi}:${se}`;
}

/** Read a string field off the pdfjs `info` bag, treating empty strings as missing. */
function readInfoString(info: Record<string, unknown> | undefined, key: string): string | undefined {
  const v = info?.[key];
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

interface InternalState {
  loadingTask: ReturnType<typeof pdfjs.getDocument> | null;
  doc: PDFDocumentProxy | null;
  /** Monotonic counter — each load bumps it; results from older loads are dropped. */
  generation: number;
}

export function usePdfDocumentAdapter(
  sourceRef: ComputedRef<PdfDocumentSource | null>,
): PdfDocumentAdapterReturn {
  const status = ref<DocumentStatus>('idle');
  const pdfDoc = shallowRef<PDFDocumentProxy | null>(null);
  const pageProviders = shallowRef<PageProvider[] | null>(null);
  const info = shallowRef<DocumentInfo | null>(null);
  const error = ref<unknown>(null);

  const internal: InternalState = {
    loadingTask: null,
    doc: null,
    generation: 0,
  };

  async function destroy(): Promise<void> {
    internal.generation += 1;

    if (internal.loadingTask) {
      try {
        internal.loadingTask.destroy();
      } catch {
        /* noop — destroying a settled task is safe */
      }
      internal.loadingTask = null;
    }
    if (internal.doc) {
      try {
        await internal.doc.destroy();
      } catch {
        /* noop */
      }
      internal.doc = null;
    }
    pdfDoc.value = null;
    pageProviders.value = null;
    info.value = null;
    status.value = 'idle';
    error.value = null;
  }

  async function loadFrom(source: PdfDocumentSource): Promise<void> {
    await destroy();

    const myGeneration = internal.generation;
    status.value = 'loading';
    error.value = null;

    const headers = source.headers;
    const httpHeaders = Object.keys(headers).length ? { ...headers } : undefined;

    let task: ReturnType<typeof pdfjs.getDocument>;
    try {
      task = pdfjs.getDocument({
        url: source.url,
        withCredentials: source.withCredentials,
        httpHeaders,
      });
      internal.loadingTask = task;
    } catch (err) {
      if (myGeneration === internal.generation) {
        status.value = 'error';
        error.value = err;
      }
      return;
    }

    let doc: PDFDocumentProxy;
    try {
      doc = await task.promise;
    } catch (err) {
      if (myGeneration !== internal.generation) return;
      internal.loadingTask = null;
      status.value = 'error';
      error.value = err;
      return;
    }

    if (myGeneration !== internal.generation) {
      // Stale result — newer load (or destroy) happened while we awaited.
      try {
        await doc.destroy();
      } catch {
        /* noop */
      }
      return;
    }

    internal.doc = doc;

    // Materialize all PageProviders up-front. Same cost as the previous
    // `buildPageEntries` did in usePageRenderer — pdfjs's `getPage()` is
    // cheap (metadata only; raster work happens in `render()`).
    const providers: PageProvider[] = [];
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        if (myGeneration !== internal.generation) {
          // Cancelled mid-iteration — drop everything cleanly.
          try {
            await doc.destroy();
          } catch {
            /* noop */
          }
          return;
        }
        providers.push(createPdfPageProvider(page));
      }
    } catch (err) {
      if (myGeneration !== internal.generation) return;
      internal.loadingTask = null;
      status.value = 'error';
      error.value = err;
      return;
    }

    // Build the info bag. `getMetadata()` returns `{ info, metadata, contentLength, ... }`
    // — we read the simple bag and the file size. Failures here are non-fatal:
    // the document still renders even without metadata.
    let docInfo: DocumentInfo;
    try {
      // pdfjs types `info` as `Object` and doesn't expose `contentLength` on
      // its `Metadata` type even though it's set at runtime (file size). Cast
      // through `unknown` so we can read both without a wider `any`.
      const meta = (await doc.getMetadata()) as unknown as {
        info?: Record<string, unknown>;
        contentLength?: number | null;
      };
      const infoBag = meta.info;
      const pdf: PdfMetadata = {
        title: readInfoString(infoBag, 'Title'),
        author: readInfoString(infoBag, 'Author'),
        subject: readInfoString(infoBag, 'Subject'),
        keywords: readInfoString(infoBag, 'Keywords'),
        creator: readInfoString(infoBag, 'Creator'),
        producer: readInfoString(infoBag, 'Producer'),
        creationDate: parsePdfDate(readInfoString(infoBag, 'CreationDate')),
        modificationDate: parsePdfDate(readInfoString(infoBag, 'ModDate')),
        version: readInfoString(infoBag, 'PDFFormatVersion'),
      };
      docInfo = {
        kind: 'pdf',
        format: pdf.version ? `PDF · v${pdf.version}` : 'PDF',
        pageCount: doc.numPages,
        bytes: typeof meta.contentLength === 'number' ? meta.contentLength : undefined,
        pdf,
      };
    } catch {
      // Metadata fetch can fail on a damaged or oddly-encoded PDF — still surface
      // basic info from the doc we did manage to load.
      docInfo = { kind: 'pdf', format: 'PDF', pageCount: doc.numPages };
    }

    if (myGeneration !== internal.generation) return;

    // Publish atomically — page list + doc + info go visible in the same tick so
    // downstream watchers see consistent state.
    pdfDoc.value = doc;
    pageProviders.value = providers;
    info.value = docInfo;
    status.value = 'ready';
  }

  function retry() {
    const s = sourceRef.value;
    if (s) void loadFrom(s);
  }

  watch(
    sourceRef,
    (source) => {
      if (source) {
        void loadFrom(source);
      } else {
        void destroy();
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    void destroy();
  });

  return { status, pdfDoc, pageProviders, info, error, retry, destroy };
}
