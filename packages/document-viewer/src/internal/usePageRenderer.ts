/**
 * Page rendering pipeline for CoarDocumentViewer.
 *
 * Given a list of pre-materialized `PageProvider`s (one per page, built by
 * the active source adapter), this composable:
 *  - reactively maintains a list of page descriptors that the template `v-for`s over,
 *  - lazily rasterizes each page to its canvas the first time the wrapper enters
 *    the scroll viewport (via IntersectionObserver),
 *  - tracks the topmost visible page for toolbar / position-memory consumers,
 *  - cancels and reschedules in-flight renders cleanly when the providers, scale,
 *    or rotation change.
 *
 * The composable owns the `<canvas>` and `.textLayer` DOM imperatively (the
 * underlying renderer needs an actual canvas reference; the textLayer container
 * is a stable anchor for selectable spans). Wrappers are template-driven so
 * later layers (annotations, search) get a per-page DOM anchor.
 *
 * Format-specific work — pdfjs render tasks, TextLayer construction, image
 * `drawImage` paths — lives behind the `PageProvider` interface in
 * `./page-provider.ts`. This file is fully source-agnostic; format-specific
 * loading happens in `src/sources/*-adapter.ts` and the dispatch in
 * `./useDocumentLoader.ts`.
 */
import {
  onBeforeUnmount,
  ref,
  shallowReactive,
  watch,
  type Ref,
  type ShallowReactive,
  type ShallowRef,
} from 'vue';
import { isCancelError, type PageProvider, type PageRotation } from './page-provider';

export type { PageRotation };

export interface PageEntry {
  /** 0-based page index. */
  index: number;
  /** Intrinsic width in the source's native units (PDF user units, image natural px, …). */
  intrinsicWidth: number;
  intrinsicHeight: number;
  /** Current display dimensions (intrinsic × scale, rotation-aware). */
  displayWidth: number;
  displayHeight: number;
  /** Wrapper div ref — set by the template via `:ref="(el) => bindWrapper(index, el)"`. */
  wrapper: HTMLDivElement | null;
  /** Whether the canvas has been rasterized (at the current scale/rotation). */
  rendered: boolean;
  /** Whether a render is currently in flight. */
  rendering: boolean;
}

export interface UsePageRendererOptions {
  /** Pre-materialized page providers from the active source adapter. Null when no document is loaded. */
  pageProviders: ShallowRef<PageProvider[] | null>;
  /** Reactive zoom factor. 1 = 100%. */
  scale: Ref<number>;
  /** Reactive rotation in 90-degree steps. */
  rotation: Ref<PageRotation>;
  /** Reactive scroll-container element — used as the IntersectionObserver root. */
  scrollContainer: Ref<HTMLElement | null>;
  /**
   * Device-pixel-ratio multiplier applied to canvas raster dimensions only.
   * Defaults to `window.devicePixelRatio` (clamped to 2 to avoid huge canvases).
   */
  devicePixelRatio?: () => number;
}

export interface UsePageRendererReturn {
  pages: ShallowReactive<PageEntry[]>;
  /** 0-based index of the topmost visible page. */
  visiblePage: Ref<number>;
  /** Bind a wrapper element from the template's `:ref`. */
  bindWrapper: (index: number, el: unknown) => void;
  /** Scroll the given page into view. */
  scrollToPage: (index: number, opts?: { behavior?: ScrollBehavior }) => void;
  /**
   * Invalidate all rendered canvases (call after scale or rotation changes).
   * Visible pages re-render immediately; off-screen pages re-render on intersect.
   */
  invalidateRenders: () => void;
}

const DEFAULT_DPR_CAP = 2;

export function usePageRenderer(options: UsePageRendererOptions): UsePageRendererReturn {
  const pages = shallowReactive<PageEntry[]>([]);
  const visiblePage = ref(0);

  /** PageProvider cache, keyed by page index. Providers own their own cancel state. */
  const providerByIndex = new Map<number, PageProvider>();
  /** Most-recently observed intersection ratio per page, for visible-page tracking. */
  const intersections = new Map<number, number>();

  let observer: IntersectionObserver | null = null;

  function getDpr(): number {
    if (options.devicePixelRatio) return options.devicePixelRatio();
    if (typeof window === 'undefined') return 1;
    return Math.min(window.devicePixelRatio || 1, DEFAULT_DPR_CAP);
  }

  function cancelAllProviders() {
    for (const provider of providerByIndex.values()) {
      provider.cancel();
    }
  }

  function makeObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    const root = options.scrollContainer.value;
    if (!root || typeof IntersectionObserver === 'undefined') return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idxAttr = (entry.target as HTMLElement).dataset.pageIndex;
          if (idxAttr == null) continue;
          const idx = Number(idxAttr);
          intersections.set(idx, entry.intersectionRatio);

          if (entry.isIntersecting) {
            const page = pages[idx];
            if (page && !page.rendered && !page.rendering) {
              void renderPage(idx);
            }
          }
        }
        updateVisiblePage();
      },
      {
        root,
        // Pre-render pages 300px above/below viewport for smooth scroll feel.
        rootMargin: '300px 0px 300px 0px',
        threshold: [0, 0.1, 0.5, 1],
      },
    );

    for (const page of pages) {
      if (page.wrapper) observer.observe(page.wrapper);
    }
  }

  function updateVisiblePage() {
    // The topmost page with the largest intersection ratio is "current".
    let bestIdx = 0;
    let bestRatio = -1;
    for (const page of pages) {
      const ratio = intersections.get(page.index) ?? 0;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestIdx = page.index;
      }
    }
    if (bestRatio > 0 && visiblePage.value !== bestIdx) {
      visiblePage.value = bestIdx;
    }
  }

  function computeDisplaySize(intrinsicW: number, intrinsicH: number): { w: number; h: number } {
    const scale = options.scale.value;
    const rot = options.rotation.value;
    const rotated = rot === 90 || rot === 270;
    return {
      w: (rotated ? intrinsicH : intrinsicW) * scale,
      h: (rotated ? intrinsicW : intrinsicH) * scale,
    };
  }

  function buildPageEntries(providers: readonly PageProvider[]) {
    pages.splice(0, pages.length);
    providerByIndex.clear();
    intersections.clear();

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      providerByIndex.set(i, provider);
      const { w, h } = computeDisplaySize(provider.intrinsicWidth, provider.intrinsicHeight);
      pages.push({
        index: i,
        intrinsicWidth: provider.intrinsicWidth,
        intrinsicHeight: provider.intrinsicHeight,
        displayWidth: w,
        displayHeight: h,
        wrapper: null,
        rendered: false,
        rendering: false,
      });
    }
  }

  function recomputeDisplaySizes() {
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const { w, h } = computeDisplaySize(p.intrinsicWidth, p.intrinsicHeight);
      // Wholesale-replace so `shallowReactive` triggers a template re-render.
      // Mutating `p.displayWidth = …` on a shallow-reactive item doesn't fire
      // reactivity — only top-level array writes do.
      pages[i] = { ...p, displayWidth: w, displayHeight: h };
      // Update existing canvas + textLayer CSS dimensions immediately. Without
      // this, off-screen pages keep their previous-zoom canvas size until the
      // IntersectionObserver re-fires; that makes them overflow the wrapper
      // and bleed into the scroll container's `scrollWidth`, manifesting as
      // a spurious horizontal scrollbar. The raster pixels stay at the old
      // resolution; only the CSS box shrinks/grows. A blurry frame is
      // acceptable until the lazy re-render replaces it at full quality.
      if (p.wrapper) {
        const canvas = p.wrapper.querySelector<HTMLCanvasElement>(
          'canvas.coar-pdf-page__canvas',
        );
        if (canvas) {
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
        }
        const tl = p.wrapper.querySelector<HTMLDivElement>('div.textLayer');
        if (tl) {
          tl.style.width = `${w}px`;
          tl.style.height = `${h}px`;
        }
      }
    }
  }

  async function renderPage(index: number): Promise<void> {
    const page = pages[index];
    const provider = providerByIndex.get(index);
    if (!page || !provider || !page.wrapper) return;
    if (page.rendering) return;

    page.rendering = true;

    const scale = options.scale.value;
    const rotation = options.rotation.value;
    const dpr = getDpr();

    // Find or create the canvas inside the wrapper.
    let canvas = page.wrapper.querySelector<HTMLCanvasElement>('canvas.coar-pdf-page__canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'coar-pdf-page__canvas';
      // Insert as first child so future layers (text, annotations) stack above.
      page.wrapper.insertBefore(canvas, page.wrapper.firstChild);
    }
    canvas.style.width = `${page.displayWidth}px`;
    canvas.style.height = `${page.displayHeight}px`;

    try {
      await provider.render(canvas, { scale, rotation, dpr });
      page.rendered = true;
    } catch (err) {
      // Cancel exceptions are expected on scale changes / unmount.
      if (!isCancelError(err)) {
        // Surface unexpected errors via console — the parent component owns
        // user-facing error UI for the document-level load, not per-page
        // render failures.
        console.error(`[CoarDocumentViewer] page ${index + 1} render failed`, err);
      }
    } finally {
      page.rendering = false;
    }

    // After the raster lands, build the selectable text layer over it — but
    // only if the provider supports it. Image sources omit `getTextLayer` so
    // the `.textLayer` div is never created (its default `pointer-events: auto`
    // would otherwise swallow clicks above an image with no selectable text).
    if (provider.getTextLayer) {
      await renderTextLayer(index, provider);
    }
  }

  /**
   * Build (or rebuild) the invisible text layer that overlays the canvas.
   * Selectable text + native Ctrl+C copy follow from this — see the scoped
   * `.textLayer` styles in CoarDocumentViewer.vue (mirrored from pdfjs's own viewer).
   */
  async function renderTextLayer(index: number, provider: PageProvider): Promise<void> {
    if (!provider.getTextLayer) return;
    const page = pages[index];
    if (!page?.wrapper) return;

    const scale = options.scale.value;
    const rotation = options.rotation.value;

    let container = page.wrapper.querySelector<HTMLDivElement>('div.textLayer');
    if (!container) {
      container = document.createElement('div');
      container.className = 'textLayer';
      // Append AFTER the canvas so it stacks on top (selection sits above raster).
      page.wrapper.appendChild(container);
    }
    container.style.width = `${page.displayWidth}px`;
    container.style.height = `${page.displayHeight}px`;
    container.style.setProperty('--total-scale-factor', String(scale));

    // Bail if the page wrapper was torn down or the user moved on between awaits.
    if (!page.wrapper.contains(container)) return;

    try {
      await provider.getTextLayer(container, { scale, rotation });
    } catch (err) {
      if (!isCancelError(err)) {
        // Text-layer failures are non-fatal — the canvas is still visible, the
        // user just can't select text from this page.
        console.warn(`[CoarDocumentViewer] text layer for page ${index + 1} failed`, err);
      }
    }
  }

  function bindWrapper(index: number, el: unknown) {
    const page = pages[index];
    if (!page) return;
    // Vue's template-ref callback signature is `(el: Element | ComponentPublicInstance | null)`.
    // We only ever apply it to a plain `<div>`, so a runtime narrowing is enough.
    const wrapper = el instanceof HTMLDivElement ? el : null;

    if (page.wrapper === wrapper) return;

    if (page.wrapper && observer) observer.unobserve(page.wrapper);
    page.wrapper = wrapper;
    if (wrapper) {
      wrapper.dataset.pageIndex = String(index);
      observer?.observe(wrapper);
    }
  }

  function scrollToPage(index: number, opts: { behavior?: ScrollBehavior } = {}) {
    const page = pages[index];
    if (!page?.wrapper) return;
    page.wrapper.scrollIntoView({
      behavior: opts.behavior ?? 'auto',
      block: 'start',
      inline: 'nearest',
    });
  }

  function invalidateRenders() {
    recomputeDisplaySizes();
    cancelAllProviders();
    for (const page of pages) {
      page.rendered = false;
    }

    // Re-render every page that currently intersects the viewport.
    for (const [idx, ratio] of intersections) {
      if (ratio > 0) void renderPage(idx);
    }
  }

  // Providers change (new document loaded, or source switched): rebuild page list.
  watch(
    () => options.pageProviders.value,
    (providers) => {
      // Cancel in-flight renders on the OLD providers before swapping. The
      // adapter that owned them may already have destroyed the underlying
      // document (e.g. pdfjs `doc.destroy()` cancels its render tasks), so
      // these `cancel()` calls are idempotent.
      cancelAllProviders();
      providerByIndex.clear();
      intersections.clear();
      pages.splice(0, pages.length);
      visiblePage.value = 0;

      if (!providers) return;
      buildPageEntries(providers);
      // Observer is (re)attached after wrappers mount — see scrollContainer watcher.
      // But if the container already exists, re-observe known wrappers.
      if (observer) {
        for (const page of pages) {
          if (page.wrapper) observer.observe(page.wrapper);
        }
      }
    },
    { immediate: true },
  );

  // Scroll container appears (or changes): (re)create the IntersectionObserver.
  watch(
    () => options.scrollContainer.value,
    () => {
      makeObserver();
    },
    { immediate: true },
  );

  // Scale / rotation changes: resize wrappers, invalidate canvases, re-render visible.
  watch(
    () => [options.scale.value, options.rotation.value] as const,
    () => {
      invalidateRenders();
    },
  );

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    cancelAllProviders();
    providerByIndex.clear();
  });

  return {
    pages,
    visiblePage,
    bindWrapper,
    scrollToPage,
    invalidateRenders,
  };
}
