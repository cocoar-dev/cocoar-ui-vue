/**
 * Top-level document loader dispatcher.
 *
 * Watches a `DocumentSource` ref and routes to the right per-format adapter
 * based on `source.kind`. The adapters themselves (`usePdfDocumentAdapter`,
 * `useImageDocumentAdapter`) are always-mounted; each sees its own filtered
 * source slice (`null` when the active kind doesn't match), so the inactive
 * adapter stays idle.
 *
 * Why always-mounted: composables can't be conditionally instantiated within
 * a single render tree. Mounting both and letting each watch its own filtered
 * source keeps the dispatch reactive without component-level remounting.
 *
 * The returned shape unifies the format-specific outputs:
 *   - `pdfDoc` is a PDF-only escape hatch consumed by `DocumentSidebar` (outline)
 *     and `usePdfSearch` (text content). Null for non-PDF sources — the
 *     consumers gate themselves on `source.capabilities.outline` / `.search`.
 *   - `pageProviders` is source-agnostic and drives `usePageRenderer`.
 */
import { computed, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type {
  DocumentInfo,
  DocumentSource,
  ImageDocumentSource,
  ImageGalleryDocumentSource,
  PdfDocumentSource,
} from '../source-types';
import type { PageProvider } from './page-provider';
import { usePdfDocumentAdapter, type DocumentStatus } from '../sources/pdf-adapter';
import { useImageDocumentAdapter } from '../sources/image-adapter';
import { useImageGalleryAdapter } from '../sources/image-gallery-adapter';

export type { DocumentStatus };

export interface DocumentLoaderReturn {
  status: Ref<DocumentStatus>;
  /** PDF-only escape hatch for sidebar + search. Null for image sources. */
  pdfDoc: ShallowRef<PDFDocumentProxy | null>;
  /** Source-agnostic page providers — fed to `usePageRenderer`. */
  pageProviders: ShallowRef<PageProvider[] | null>;
  /** Source-level metadata for the optional Info panel — null until `status === 'ready'`. */
  info: ShallowRef<DocumentInfo | null>;
  error: Ref<unknown>;
  retry: () => void;
  destroy: () => Promise<void>;
}

export function useDocumentLoader(
  sourceRef: ComputedRef<DocumentSource | null>,
): DocumentLoaderReturn {
  // Per-kind filtered source slices. The PDF adapter sees a non-null source
  // only when `source.kind === 'pdf'`; same pattern will apply to image
  // adapter (sub-task C).
  const pdfSource = computed<PdfDocumentSource | null>(() => {
    const s = sourceRef.value;
    return s?.kind === 'pdf' ? s : null;
  });
  const imageSource = computed<ImageDocumentSource | null>(() => {
    const s = sourceRef.value;
    return s?.kind === 'image' ? s : null;
  });
  const gallerySource = computed<ImageGalleryDocumentSource | null>(() => {
    const s = sourceRef.value;
    return s?.kind === 'image-gallery' ? s : null;
  });

  const pdf = usePdfDocumentAdapter(pdfSource);
  const image = useImageDocumentAdapter(imageSource);
  const gallery = useImageGalleryAdapter(gallerySource);

  const status = computed<DocumentStatus>(() => {
    const s = sourceRef.value;
    if (!s) return 'idle';
    if (s.kind === 'pdf') return pdf.status.value;
    if (s.kind === 'image') return image.status.value;
    if (s.kind === 'image-gallery') return gallery.status.value;
    return 'idle';
  });

  const error = computed<unknown>(() => {
    const s = sourceRef.value;
    if (s?.kind === 'pdf') return pdf.error.value;
    if (s?.kind === 'image') return image.error.value;
    if (s?.kind === 'image-gallery') return gallery.error.value;
    return null;
  });

  const pageProviders = computed<PageProvider[] | null>(() => {
    const s = sourceRef.value;
    if (s?.kind === 'pdf') return pdf.pageProviders.value;
    if (s?.kind === 'image') return image.pageProviders.value;
    if (s?.kind === 'image-gallery') return gallery.pageProviders.value;
    return null;
  });

  const info = computed<DocumentInfo | null>(() => {
    const s = sourceRef.value;
    if (s?.kind === 'pdf') return pdf.info.value;
    if (s?.kind === 'image') return image.info.value;
    if (s?.kind === 'image-gallery') return gallery.info.value;
    return null;
  });

  function retry() {
    const s = sourceRef.value;
    if (s?.kind === 'pdf') pdf.retry();
    else if (s?.kind === 'image') image.retry();
    else if (s?.kind === 'image-gallery') gallery.retry();
  }

  async function destroy(): Promise<void> {
    await pdf.destroy();
    await image.destroy();
    await gallery.destroy();
  }

  // Cast computeds to the Ref/ShallowRef interface — consumers only read these
  // refs (no .value assignment), and Vue's `ComputedRef<T>` is structurally
  // compatible with `Ref<T>` for read access.
  return {
    status: status as Ref<DocumentStatus>,
    pdfDoc: pdf.pdfDoc,
    pageProviders: pageProviders as unknown as ShallowRef<PageProvider[] | null>,
    info: info as unknown as ShallowRef<DocumentInfo | null>,
    error: error as Ref<unknown>,
    retry,
    destroy,
  };
}
