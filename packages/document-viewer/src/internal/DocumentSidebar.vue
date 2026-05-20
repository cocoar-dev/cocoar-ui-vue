<script setup lang="ts">
/**
 * Left-rail sidebar with two tabs:
 *  - **Thumbnails** — one tiny canvas per page, lazy-rendered via
 *    IntersectionObserver. Click a thumb to scroll to that page.
 *  - **Outline** — the PDF's table of contents, if it has one. Recursive tree
 *    with click-to-jump on each item.
 *
 * The outline tab auto-hides when the doc has no outline, so the sidebar
 * collapses to thumbnails-only on PDFs without a TOC.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
} from 'vue';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { CoarIcon } from '@cocoar/vue-ui';
import type { CoarDocumentViewerLabels } from "../CoarDocumentViewer.vue";
import type { PageProvider } from './page-provider';
import PdfOutlineList, { type OutlineNode } from './PdfOutlineList.vue';

const props = defineProps<{
  /**
   * PDF-only document proxy — used solely for outline resolution
   * (`getOutline` / `getDestination` / `getPageIndex`). Null for image
   * sources; the outline tab then auto-hides.
   */
  doc: PDFDocumentProxy | null;
  /**
   * Source-agnostic page providers, fed straight into per-page render() for
   * thumbnails. Lets the sidebar render image / gallery thumbnails through
   * the same code path as PDFs.
   */
  pageProviders: readonly PageProvider[] | null;
  pageCount: number;
  visiblePage: number;
  showThumbnails: boolean;
  showOutline: boolean;
  labels: Required<CoarDocumentViewerLabels>;
}>();

const emit = defineEmits<{
  (e: 'jump', pageIndex: number): void;
  (e: 'close'): void;
}>();

/** Which tab is showing — falls back if the requested one isn't available. */
const activeTab = ref<'thumbnails' | 'outline'>('thumbnails');

/** Outline tree, populated when the doc loads. `null` = doc has no outline. */
const outline = shallowRef<OutlineNode[] | null>(null);
const outlineLoading = ref(false);

watch(
  () => props.doc,
  async (doc) => {
    outline.value = null;
    if (!doc) return;
    outlineLoading.value = true;
    try {
      const raw = (await doc.getOutline()) as
        | Array<{ title: string; dest: string | unknown[] | null; items: unknown[] }>
        | null;
      if (!raw || raw.length === 0) {
        outline.value = null;
      } else {
        outline.value = raw as unknown as OutlineNode[];
      }
    } catch {
      outline.value = null;
    } finally {
      outlineLoading.value = false;
    }
  },
  { immediate: true },
);

const hasOutline = computed(() => outline.value && outline.value.length > 0);

// Snap the active tab back to thumbnails if the outline disappears.
watch(hasOutline, (has) => {
  if (!has && activeTab.value === 'outline') activeTab.value = 'thumbnails';
});

/* ---- Thumbnails ---------------------------------------------------- */

/** CSS pixel width for thumbnails — small enough to fit ~6 visible at once. */
const THUMB_WIDTH = 120;

const thumbsContainer = ref<HTMLDivElement | null>(null);
/** Tracks per-page render state. */
const rendered = new Set<number>();
const rendering = new Set<number>();
let observer: IntersectionObserver | null = null;

async function renderThumb(idx: number): Promise<void> {
  if (rendered.has(idx) || rendering.has(idx)) return;
  const wrapper = thumbsContainer.value?.querySelector<HTMLElement>(
    `[data-thumb-page="${idx}"]`,
  );
  if (!wrapper) return;
  const provider = props.pageProviders?.[idx];
  if (!provider) return;

  rendering.add(idx);
  try {
    const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    // Scale the intrinsic page to fit THUMB_WIDTH on the CSS axis.
    const scale = THUMB_WIDTH / provider.intrinsicWidth;
    let canvas = wrapper.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'coar-pdf-sidebar__thumb-canvas';
      wrapper.insertBefore(canvas, wrapper.firstChild);
    }
    // Provider sets canvas raster dims (scale × dpr); we own CSS sizing here.
    canvas.style.width = `${THUMB_WIDTH}px`;
    canvas.style.height = `${Math.floor(provider.intrinsicHeight * scale)}px`;
    await provider.render(canvas, { scale, rotation: 0, dpr });
    rendered.add(idx);
  } catch {
    /* render failures are non-fatal — the thumb wrapper stays blank */
  } finally {
    rendering.delete(idx);
  }
}

function setupObserver() {
  observer?.disconnect();
  const root = thumbsContainer.value;
  if (!root || typeof IntersectionObserver === 'undefined') return;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const idx = Number((entry.target as HTMLElement).dataset.thumbPage);
        if (Number.isFinite(idx)) void renderThumb(idx);
      }
    },
    { root, rootMargin: '200px 0px', threshold: 0 },
  );
  for (const el of root.querySelectorAll<HTMLElement>('[data-thumb-page]')) {
    observer.observe(el);
  }
}

// (Re)build observer + clear cached canvases when the source providers swap.
watch(
  () => [props.pageProviders, props.pageCount] as const,
  async () => {
    rendered.clear();
    rendering.clear();
    await nextTick();
    setupObserver();
  },
  { immediate: true },
);

// Re-observe after switching tabs (DOM nodes change).
watch(activeTab, async () => {
  if (activeTab.value !== 'thumbnails') return;
  await nextTick();
  setupObserver();
});

// Scroll the visible-page thumb into view as the user scrolls the main viewer.
watch(
  () => props.visiblePage,
  async (idx) => {
    if (activeTab.value !== 'thumbnails') return;
    await nextTick();
    const el = thumbsContainer.value?.querySelector<HTMLElement>(`[data-thumb-page="${idx}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },
);

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

/* ---- Outline ------------------------------------------------------- */

/**
 * Resolve a destination (named or explicit) to a 0-based page index.
 * Memoised on the outline node itself so a re-click is instant.
 */
async function destToPageIndex(node: OutlineNode): Promise<number | null> {
  if (node.resolvedPageIndex != null) return node.resolvedPageIndex;
  const d = node.dest;
  if (!d || !props.doc) return null;
  try {
    let explicit = d;
    if (typeof d === 'string') {
      const resolved = await props.doc.getDestination(d);
      if (!resolved) return null;
      explicit = resolved;
    }
    if (!Array.isArray(explicit) || explicit.length === 0) return null;
    const ref = explicit[0] as { num: number; gen: number };
    const pageIndex = await props.doc.getPageIndex(ref);
    node.resolvedPageIndex = pageIndex;
    return pageIndex;
  } catch {
    return null;
  }
}

async function onOutlineClick(node: OutlineNode) {
  const idx = await destToPageIndex(node);
  if (idx != null) emit('jump', idx);
}
</script>

<template>
  <aside class="coar-pdf-sidebar" :aria-label="labels.thumbnails">
    <div class="coar-pdf-sidebar__header">
      <div class="coar-pdf-sidebar__tabs" role="tablist">
        <button
          v-if="showThumbnails"
          type="button"
          class="coar-pdf-sidebar__tab"
          :class="{ 'coar-pdf-sidebar__tab--active': activeTab === 'thumbnails' }"
          role="tab"
          :aria-selected="activeTab === 'thumbnails'"
          @click="activeTab = 'thumbnails'"
        >{{ labels.thumbnails }}</button>
        <button
          v-if="showOutline && hasOutline"
          type="button"
          class="coar-pdf-sidebar__tab"
          :class="{ 'coar-pdf-sidebar__tab--active': activeTab === 'outline' }"
          role="tab"
          :aria-selected="activeTab === 'outline'"
          @click="activeTab = 'outline'"
        >{{ labels.outline }}</button>
      </div>
      <button
        type="button"
        class="coar-pdf-sidebar__close"
        title="Close"
        aria-label="Close"
        @click="emit('close')"
      >
        <CoarIcon name="x" size="s" />
      </button>
    </div>

    <!-- Thumbnails grid -->
    <div
      v-show="activeTab === 'thumbnails' && showThumbnails"
      ref="thumbsContainer"
      class="coar-pdf-sidebar__thumbs"
      role="tabpanel"
    >
      <button
        v-for="i in pageCount"
        :key="i"
        type="button"
        class="coar-pdf-sidebar__thumb"
        :class="{ 'coar-pdf-sidebar__thumb--current': i - 1 === visiblePage }"
        :data-thumb-page="i - 1"
        :aria-label="`Page ${i}`"
        :aria-current="i - 1 === visiblePage ? 'page' : undefined"
        @click="emit('jump', i - 1)"
      >
        <!-- canvas is appended imperatively when this wrapper intersects -->
        <span class="coar-pdf-sidebar__thumb-label">{{ i }}</span>
      </button>
    </div>

    <!-- Outline tree -->
    <div
      v-if="activeTab === 'outline'"
      class="coar-pdf-sidebar__outline"
      role="tabpanel"
    >
      <PdfOutlineList v-if="outline" :nodes="outline" @jump="onOutlineClick" />
    </div>
  </aside>
</template>

<style scoped>
.coar-pdf-sidebar {
  display: flex;
  flex-direction: column;
  width: 200px;
  flex: 0 0 200px;
  background: var(--coar-color-surface-2, #f6f7f8);
  border-right: 1px solid var(--coar-color-border, #e5e7eb);
  font-size: 12px;
  overflow: hidden;
}

.coar-pdf-sidebar__header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 4px 4px 8px;
  border-bottom: 1px solid var(--coar-color-border, #e5e7eb);
}

.coar-pdf-sidebar__tabs {
  display: flex;
  flex: 1 1 auto;
  gap: 4px;
}

.coar-pdf-sidebar__tab {
  appearance: none;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--coar-color-fg-muted, #6b7280);
  cursor: pointer;
  font: inherit;
  border-radius: 4px;
}
.coar-pdf-sidebar__tab--active {
  color: var(--coar-color-fg, #1a1a1a);
  font-weight: 600;
  background: var(--coar-color-surface, #ffffff);
}
.coar-pdf-sidebar__tab:hover:not(.coar-pdf-sidebar__tab--active) {
  background: var(--coar-color-surface-3, rgba(0, 0, 0, 0.04));
}

.coar-pdf-sidebar__close {
  appearance: none;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 4px;
}
.coar-pdf-sidebar__close:hover {
  background: var(--coar-color-surface-3, rgba(0, 0, 0, 0.06));
}

.coar-pdf-sidebar__thumbs {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.coar-pdf-sidebar__thumb {
  appearance: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  color: inherit;
  width: 100%;
}
.coar-pdf-sidebar__thumb:hover {
  border-color: var(--coar-color-border, #e5e7eb);
}
.coar-pdf-sidebar__thumb--current {
  border-color: var(--coar-color-accent, #2563eb);
}

.coar-pdf-sidebar__thumb :deep(.coar-pdf-sidebar__thumb-canvas) {
  display: block;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
/* Skeleton placeholder for the un-rendered thumb so the list height is stable. */
.coar-pdf-sidebar__thumb:not(:has(canvas)) {
  min-height: 130px;
  background: var(--coar-color-surface, #ffffff);
}

.coar-pdf-sidebar__thumb-label {
  color: var(--coar-color-fg-muted, #6b7280);
  font-variant-numeric: tabular-nums;
}

.coar-pdf-sidebar__outline {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 4px 0;
}

.coar-pdf-sidebar__outline :deep(.coar-pdf-sidebar__outline-list) {
  list-style: none;
  margin: 0;
  padding: 0;
}
.coar-pdf-sidebar__outline :deep(.coar-pdf-sidebar__outline-link) {
  appearance: none;
  display: block;
  width: 100%;
  text-align: left;
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  border-radius: 2px;
}
.coar-pdf-sidebar__outline :deep(.coar-pdf-sidebar__outline-link:hover) {
  background: var(--coar-color-surface-3, rgba(0, 0, 0, 0.06));
}
</style>
