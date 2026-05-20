/**
 * Image gallery source adapter.
 *
 * Treats an array of image URLs as a single multi-page document — one
 * `PageProvider` per URL, all loaded in parallel. The viewer's prev/next/
 * page-input activate (capabilities.multiPage=true), and pages can mix
 * orientations (each provider carries its own intrinsic dims).
 *
 * Loading is all-or-nothing for v0: a single failed image puts the whole
 * gallery in error state. The generation counter drops stale results when
 * the user switches galleries quickly; in-flight loads are aborted by
 * setting each `<img>`'s `src=''`.
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
import type { DocumentInfo, ImageGalleryDocumentSource } from '../source-types';
import type { PageProvider } from '../internal/page-provider';
import type { DocumentStatus } from './pdf-adapter';
import { createImagePageProvider, inferImageFormat } from './image-adapter';

export interface ImageGalleryAdapterReturn {
  status: Ref<DocumentStatus>;
  pageProviders: ShallowRef<PageProvider[] | null>;
  info: ShallowRef<DocumentInfo | null>;
  error: Ref<unknown>;
  retry: () => void;
  destroy: () => Promise<void>;
}

function loadImage(url: string): { img: HTMLImageElement; promise: Promise<HTMLImageElement> } {
  const img = new Image();
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
  });
  img.src = url;
  return { img, promise };
}

export function useImageGalleryAdapter(
  sourceRef: ComputedRef<ImageGalleryDocumentSource | null>,
): ImageGalleryAdapterReturn {
  const status = ref<DocumentStatus>('idle');
  const pageProviders = shallowRef<PageProvider[] | null>(null);
  const info = shallowRef<DocumentInfo | null>(null);
  const error = ref<unknown>(null);

  let generation = 0;
  let activeImages: HTMLImageElement[] = [];

  async function destroy(): Promise<void> {
    generation += 1;
    for (const img of activeImages) {
      img.onload = null;
      img.onerror = null;
      img.src = '';
    }
    activeImages = [];
    pageProviders.value = null;
    info.value = null;
    status.value = 'idle';
    error.value = null;
  }

  function buildInfo(urls: readonly string[], count: number): DocumentInfo {
    const formats = new Set(urls.map(inferImageFormat));
    const formatLabel =
      formats.size === 0
        ? 'Image gallery'
        : formats.size === 1
          ? `Image gallery · ${[...formats][0]}`
          : 'Image gallery · mixed';
    return { kind: 'image-gallery', format: formatLabel, pageCount: count };
  }

  function loadFrom(source: ImageGalleryDocumentSource): void {
    void destroy().then(async () => {
      const myGeneration = ++generation;
      status.value = 'loading';
      error.value = null;

      if (source.urls.length === 0) {
        // Empty gallery — treat as ready with zero pages rather than an error.
        pageProviders.value = [];
        info.value = buildInfo(source.urls, 0);
        status.value = 'ready';
        return;
      }

      const handles = source.urls.map((url) => loadImage(url));
      activeImages = handles.map((h) => h.img);

      try {
        const imgs = await Promise.all(handles.map((h) => h.promise));
        if (myGeneration !== generation) return; // stale
        pageProviders.value = imgs.map((img) => createImagePageProvider(img));
        info.value = buildInfo(source.urls, imgs.length);
        status.value = 'ready';
      } catch (err) {
        if (myGeneration !== generation) return;
        status.value = 'error';
        error.value = err;
      }
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
