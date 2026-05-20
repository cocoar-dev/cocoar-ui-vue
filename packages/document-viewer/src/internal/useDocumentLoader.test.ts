import { computed, ref, shallowRef } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DocumentSource,
  ImageDocumentSource,
  ImageGalleryDocumentSource,
  PdfDocumentSource,
} from '../source-types';

// Mock the three adapter modules. Each mock exposes a fake `useXxxAdapter`
// that returns mutable refs the tests can drive, plus a `__last` handle so
// the test can reach the adapter instance the dispatcher constructed.
//
// IMPORTANT: vi.mock factories are hoisted and cannot reference outer-scope
// variables — so we attach the test-side handles via a globalThis bag.
vi.mock('../sources/pdf-adapter', () => {
  const make = () => ({
    status: ref<'idle' | 'loading' | 'ready' | 'error'>('idle'),
    pdfDoc: shallowRef<unknown>(null),
    pageProviders: shallowRef<unknown[] | null>(null),
    info: shallowRef<unknown>(null),
    error: ref<unknown>(null),
    retry: vi.fn(),
    destroy: vi.fn(async () => {}),
  });
  const instance = make();
  (globalThis as unknown as { __adapterMocks: Record<string, unknown> }).__adapterMocks ??= {};
  (globalThis as unknown as { __adapterMocks: Record<string, unknown> }).__adapterMocks.pdf = instance;
  return {
    usePdfDocumentAdapter: vi.fn(() => instance),
  };
});

vi.mock('../sources/image-adapter', () => {
  const instance = {
    status: ref<'idle' | 'loading' | 'ready' | 'error'>('idle'),
    pageProviders: shallowRef<unknown[] | null>(null),
    info: shallowRef<unknown>(null),
    error: ref<unknown>(null),
    retry: vi.fn(),
    destroy: vi.fn(async () => {}),
  };
  (globalThis as unknown as { __adapterMocks: Record<string, unknown> }).__adapterMocks ??= {};
  (globalThis as unknown as { __adapterMocks: Record<string, unknown> }).__adapterMocks.image = instance;
  return {
    useImageDocumentAdapter: vi.fn(() => instance),
  };
});

vi.mock('../sources/image-gallery-adapter', () => {
  const instance = {
    status: ref<'idle' | 'loading' | 'ready' | 'error'>('idle'),
    pageProviders: shallowRef<unknown[] | null>(null),
    info: shallowRef<unknown>(null),
    error: ref<unknown>(null),
    retry: vi.fn(),
    destroy: vi.fn(async () => {}),
  };
  (globalThis as unknown as { __adapterMocks: Record<string, unknown> }).__adapterMocks ??= {};
  (globalThis as unknown as { __adapterMocks: Record<string, unknown> }).__adapterMocks.gallery = instance;
  return {
    useImageGalleryAdapter: vi.fn(() => instance),
  };
});

import { useDocumentLoader } from './useDocumentLoader';
import { usePdfDocumentAdapter } from '../sources/pdf-adapter';
import { useImageDocumentAdapter } from '../sources/image-adapter';
import { useImageGalleryAdapter } from '../sources/image-gallery-adapter';

interface AdapterMocks {
  pdf: ReturnType<typeof usePdfDocumentAdapter>;
  image: ReturnType<typeof useImageDocumentAdapter>;
  gallery: ReturnType<typeof useImageGalleryAdapter>;
}

function getMocks(): AdapterMocks {
  return (globalThis as unknown as { __adapterMocks: AdapterMocks }).__adapterMocks;
}

const PDF_SRC: PdfDocumentSource = {
  kind: 'pdf',
  url: 'https://example.com/a.pdf',
  capabilities: { outline: true, search: true, annotations: true, textSelection: true },
};
const IMG_SRC: ImageDocumentSource = {
  kind: 'image',
  url: 'https://example.com/a.png',
  capabilities: { outline: false, search: false, annotations: true, textSelection: false },
};
const GALLERY_SRC: ImageGalleryDocumentSource = {
  kind: 'image-gallery',
  urls: ['https://example.com/a.png', 'https://example.com/b.png'],
  capabilities: { outline: false, search: false, annotations: true, textSelection: false },
};

describe('useDocumentLoader', () => {
  beforeEach(() => {
    // Reset mock adapter state between tests so leftover values don't bleed across.
    const m = getMocks();
    for (const a of [m.pdf, m.image, m.gallery]) {
      a.status.value = 'idle';
      a.pageProviders.value = null;
      a.info.value = null;
      a.error.value = null;
      vi.mocked(a.retry).mockClear();
      vi.mocked(a.destroy).mockClear();
    }
    // Also clear the adapter-factory mocks themselves — `mock.calls` accumulates
    // across tests otherwise, and the dispatcher tests inspect `calls[0]`.
    vi.mocked(usePdfDocumentAdapter).mockClear();
    vi.mocked(useImageDocumentAdapter).mockClear();
    vi.mocked(useImageGalleryAdapter).mockClear();
  });

  it('mounts all three adapters up-front regardless of initial source', () => {
    const source = ref<DocumentSource | null>(null);
    useDocumentLoader(computed(() => source.value));
    expect(usePdfDocumentAdapter).toHaveBeenCalledOnce();
    expect(useImageDocumentAdapter).toHaveBeenCalledOnce();
    expect(useImageGalleryAdapter).toHaveBeenCalledOnce();
  });

  it('returns idle status / null pageProviders when source is null', () => {
    const source = ref<DocumentSource | null>(null);
    const loader = useDocumentLoader(computed(() => source.value));
    expect(loader.status.value).toBe('idle');
    expect(loader.pageProviders.value).toBeNull();
    expect(loader.info.value).toBeNull();
    expect(loader.error.value).toBeNull();
  });

  it.each([
    { kind: 'pdf', src: PDF_SRC as DocumentSource, adapter: 'pdf' as const },
    { kind: 'image', src: IMG_SRC as DocumentSource, adapter: 'image' as const },
    { kind: 'image-gallery', src: GALLERY_SRC as DocumentSource, adapter: 'gallery' as const },
  ])('routes status/pageProviders/info to the $kind adapter', ({ src, adapter }) => {
    const source = ref<DocumentSource | null>(src);
    const loader = useDocumentLoader(computed(() => source.value));
    const m = getMocks()[adapter];

    m.status.value = 'loading';
    expect(loader.status.value).toBe('loading');

    m.status.value = 'ready';
    const fakeProviders = [{ intrinsicWidth: 1, intrinsicHeight: 1 } as never];
    m.pageProviders.value = fakeProviders;
    m.info.value = { kind: src.kind, format: 'test', pageCount: 1 };
    expect(loader.pageProviders.value).toBe(fakeProviders);
    expect(loader.info.value).toMatchObject({ kind: src.kind, format: 'test', pageCount: 1 });
  });

  it('switches routing when the source kind changes', () => {
    const source = ref<DocumentSource | null>(PDF_SRC);
    const loader = useDocumentLoader(computed(() => source.value));
    const m = getMocks();

    m.pdf.status.value = 'ready';
    m.image.status.value = 'loading';

    expect(loader.status.value).toBe('ready'); // pdf adapter

    source.value = IMG_SRC;
    expect(loader.status.value).toBe('loading'); // image adapter now
  });

  it('routes retry() to the active adapter only', () => {
    const source = ref<DocumentSource | null>(IMG_SRC);
    const loader = useDocumentLoader(computed(() => source.value));
    const m = getMocks();

    loader.retry();
    expect(m.image.retry).toHaveBeenCalledOnce();
    expect(m.pdf.retry).not.toHaveBeenCalled();
    expect(m.gallery.retry).not.toHaveBeenCalled();
  });

  it('retry() is a no-op when source is null', () => {
    const source = ref<DocumentSource | null>(null);
    const loader = useDocumentLoader(computed(() => source.value));
    const m = getMocks();
    loader.retry();
    expect(m.pdf.retry).not.toHaveBeenCalled();
    expect(m.image.retry).not.toHaveBeenCalled();
    expect(m.gallery.retry).not.toHaveBeenCalled();
  });

  it('destroy() tears down all three adapters', async () => {
    const source = ref<DocumentSource | null>(PDF_SRC);
    const loader = useDocumentLoader(computed(() => source.value));
    const m = getMocks();

    await loader.destroy();
    expect(m.pdf.destroy).toHaveBeenCalledOnce();
    expect(m.image.destroy).toHaveBeenCalledOnce();
    expect(m.gallery.destroy).toHaveBeenCalledOnce();
  });

  it('exposes pdfDoc directly from the pdf adapter (escape hatch)', () => {
    const source = ref<DocumentSource | null>(PDF_SRC);
    const loader = useDocumentLoader(computed(() => source.value));
    const m = getMocks();

    // Same shallowRef instance — dispatcher does not re-wrap.
    expect(loader.pdfDoc).toBe(m.pdf.pdfDoc);
  });

  it('passes a filtered source slice to each adapter (null when kind differs)', () => {
    // shallowRef preserves identity — a plain ref() proxies the object and
    // `.value === PDF_SRC` would then fail. The dispatcher reads via `.value`
    // so the proxying isn't observable in production; here we want identity.
    const source = shallowRef<DocumentSource | null>(PDF_SRC);
    useDocumentLoader(computed(() => source.value));

    const pdfArg = vi.mocked(usePdfDocumentAdapter).mock.calls[0][0];
    const imageArg = vi.mocked(useImageDocumentAdapter).mock.calls[0][0];
    const galleryArg = vi.mocked(useImageGalleryAdapter).mock.calls[0][0];

    expect(pdfArg.value).toBe(PDF_SRC);
    expect(imageArg.value).toBeNull();
    expect(galleryArg.value).toBeNull();

    source.value = GALLERY_SRC;
    expect(pdfArg.value).toBeNull();
    expect(imageArg.value).toBeNull();
    expect(galleryArg.value).toBe(GALLERY_SRC);
  });
});
