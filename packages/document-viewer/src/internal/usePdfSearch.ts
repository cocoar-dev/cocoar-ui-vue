/**
 * Text search across a loaded PDF.
 *
 * Maintains a per-page text-content cache (populated lazily on first search),
 * matches a needle across every page, and exposes match rects in normalised
 * page coords so the overlay can render them at any zoom without recomputation.
 *
 * pdf.js's bundled `FindController` is part of the viewer module (`pdf_viewer`)
 * and brings its own `EventBus` + `LinkService` plumbing — too heavy for a
 * custom viewer like ours. Doing the substring scan + rect conversion
 * ourselves keeps the API surface tiny and the bundle small.
 */
import { computed, ref, watch, type Ref, type ShallowRef } from 'vue';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { CoarPdfRect } from '../types';

export interface SearchMatch {
  pageIndex: number;
  /** Normalised rects covering the match (multiple if the match spans items). */
  rects: CoarPdfRect[];
  /** The matched substring (for accessibility / debug). */
  text: string;
}

export interface UsePdfSearchOptions {
  doc: ShallowRef<PDFDocumentProxy | null>;
}

export interface UsePdfSearchReturn {
  query: Ref<string>;
  caseSensitive: Ref<boolean>;
  matches: Ref<SearchMatch[]>;
  currentIndex: Ref<number>;
  currentMatch: Ref<SearchMatch | null>;
  searching: Ref<boolean>;
  setQuery: (q: string) => Promise<void>;
  next: () => void;
  prev: () => void;
  clear: () => void;
}

/** One text item's contribution to the page-wide concatenation. */
interface ItemRange {
  /** Character offset where this item starts in the page text. */
  start: number;
  /** PDF coords transform (item.transform). */
  transform: number[];
  /** Logical text of the item. */
  str: string;
  /** Width of the entire item in PDF user units. */
  width: number;
  /** Height of the item (font size in PDF user units). */
  height: number;
}

interface PageTextSnapshot {
  /** Concatenated text content (no separators between items — pdf.js does that internally). */
  text: string;
  items: ItemRange[];
  /** Viewport at scale 1 — used to project PDF coords into CSS pixel coords. */
  viewport: pdfjs.PageViewport;
}

/**
 * Debounce window for re-running the search as the user types. 350ms is a
 * balance between "feels responsive" and "doesn't search on every keystroke"
 * — fast typers commit a 4-character query before any search fires.
 */
const DEBOUNCE_MS = 350;

/**
 * Below this query length we don't search at all. Single-character queries
 * produce thousands of hits on a real document and stall the renderer with
 * the per-rect DOM cost; the user almost always has 2+ chars in mind anyway.
 */
const MIN_QUERY_LENGTH = 2;

export function usePdfSearch(opts: UsePdfSearchOptions): UsePdfSearchReturn {
  const query = ref('');
  const caseSensitive = ref(false);
  const matches = ref<SearchMatch[]>([]);
  const currentIndex = ref(-1);
  const searching = ref(false);

  const cache = new Map<number, PageTextSnapshot>();
  let activeGeneration = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function ensureTextContent(idx: number): Promise<PageTextSnapshot> {
    const cached = cache.get(idx);
    if (cached) return cached;
    const doc = opts.doc.value;
    if (!doc) throw new Error('No document');
    const page = await doc.getPage(idx + 1);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
    const items: ItemRange[] = [];
    let text = '';
    for (const raw of textContent.items) {
      // `TextItem` from pdf.js — strict typing is awkward across versions, so
      // narrow at runtime instead of importing the type.
      const item = raw as {
        str?: string;
        transform?: number[];
        width?: number;
        height?: number;
      };
      if (typeof item.str !== 'string') continue;
      items.push({
        start: text.length,
        transform: item.transform ?? [1, 0, 0, 1, 0, 0],
        str: item.str,
        width: item.width ?? 0,
        height: item.height ?? 0,
      });
      text += item.str;
    }
    const snapshot: PageTextSnapshot = { text, items, viewport };
    cache.set(idx, snapshot);
    return snapshot;
  }

  /**
   * Convert a slice of a text item into normalised page-relative rects.
   * Substring positioning uses an even-character-width approximation — accurate
   * for monospaced runs and "good enough" for proportional fonts; renderers
   * that need pixel-perfect rects can post-process via `Range.getClientRects`.
   */
  function itemRangeToRect(
    item: ItemRange,
    snapshot: PageTextSnapshot,
    subStart: number,
    subEnd: number,
  ): CoarPdfRect {
    const len = Math.max(1, item.str.length);
    const charW = item.width / len;
    // PDF item.transform is [a, b, c, d, e, f] — a font matrix where (e, f) is
    // the baseline origin in PDF user units, and (a, d) carry the font size.
    const subOffset = charW * subStart;
    const subWidth = charW * (subEnd - subStart);
    // Item box in PDF coords: x = transform[4] + subOffset along the run
    // direction. We treat the run as horizontal (PDF's text-rendering matrix
    // can rotate, but the common case is identity rotation; rotated text
    // becomes axis-aligned in the viewport which is fine for highlight rects).
    const x0 = item.transform[4] + subOffset;
    const yBase = item.transform[5];
    const x1 = x0 + subWidth;
    const yTop = yBase + item.height;
    // Convert two PDF-space corners to viewport coords (CSS px at scale 1).
    const [vx0, vy0, vx1, vy1] = snapshot.viewport.convertToViewportRectangle([x0, yBase, x1, yTop]);
    const minX = Math.min(vx0, vx1);
    const maxX = Math.max(vx0, vx1);
    const minY = Math.min(vy0, vy1);
    const maxY = Math.max(vy0, vy1);
    const dw = Math.max(1, snapshot.viewport.width);
    const dh = Math.max(1, snapshot.viewport.height);
    return {
      x: minX / dw,
      y: minY / dh,
      w: (maxX - minX) / dw,
      h: (maxY - minY) / dh,
    };
  }

  /** Convert a [charStart, charEnd) range into normalised rects. */
  function matchToRects(snapshot: PageTextSnapshot, start: number, end: number): CoarPdfRect[] {
    const rects: CoarPdfRect[] = [];
    for (const item of snapshot.items) {
      const itemEnd = item.start + item.str.length;
      if (itemEnd <= start) continue;
      if (item.start >= end) break;
      const subStart = Math.max(0, start - item.start);
      const subEnd = Math.min(item.str.length, end - item.start);
      if (subEnd <= subStart) continue;
      rects.push(itemRangeToRect(item, snapshot, subStart, subEnd));
    }
    return rects;
  }

  async function runSearch(q: string): Promise<void> {
    const myGeneration = ++activeGeneration;
    const doc = opts.doc.value;
    const trimmed = q.trim();
    // Empty or too-short queries bail early without thrashing the renderer.
    if (!doc || trimmed.length < MIN_QUERY_LENGTH) {
      matches.value = [];
      currentIndex.value = -1;
      searching.value = false;
      return;
    }
    searching.value = true;
    try {
      const numPages = doc.numPages;
      const found: SearchMatch[] = [];
      const needle = caseSensitive.value ? q : q.toLowerCase();
      for (let i = 0; i < numPages; i++) {
        // Bail early if a newer search invalidated this one.
        if (myGeneration !== activeGeneration) return;
        let snap: PageTextSnapshot;
        try {
          snap = await ensureTextContent(i);
        } catch {
          continue;
        }
        const haystack = caseSensitive.value ? snap.text : snap.text.toLowerCase();
        let idx = 0;
        while (idx >= 0) {
          idx = haystack.indexOf(needle, idx);
          if (idx < 0) break;
          const end = idx + needle.length;
          const rects = matchToRects(snap, idx, end);
          if (rects.length > 0) {
            found.push({
              pageIndex: i,
              rects,
              text: snap.text.slice(idx, end),
            });
          }
          idx = end;
        }
      }
      if (myGeneration !== activeGeneration) return;
      matches.value = found;
      currentIndex.value = found.length > 0 ? 0 : -1;
    } finally {
      if (myGeneration === activeGeneration) searching.value = false;
    }
  }

  async function setQuery(q: string): Promise<void> {
    query.value = q;
    if (debounceTimer != null) clearTimeout(debounceTimer);
    return new Promise((resolve) => {
      debounceTimer = setTimeout(() => {
        void runSearch(q).then(resolve);
      }, DEBOUNCE_MS);
    });
  }

  function next() {
    if (matches.value.length === 0) return;
    currentIndex.value = (currentIndex.value + 1) % matches.value.length;
  }

  function prev() {
    if (matches.value.length === 0) return;
    currentIndex.value =
      (currentIndex.value - 1 + matches.value.length) % matches.value.length;
  }

  function clear() {
    activeGeneration++;
    if (debounceTimer != null) clearTimeout(debounceTimer);
    query.value = '';
    matches.value = [];
    currentIndex.value = -1;
    searching.value = false;
  }

  /**
   * Warm the text-content cache in the background after the document loads.
   * pdfjs's `getTextContent` is the slow part of a fresh search (~1-3 ms per
   * page on a typical doc — adds up to ~500 ms on a 144-page text-heavy PDF).
   * Doing it eagerly off the main load means the user's first search hits the
   * cache instantly. Yields between pages so we don't block the renderer.
   */
  async function warmCache(doc: PDFDocumentProxy): Promise<void> {
    const myGeneration = activeGeneration;
    for (let i = 0; i < doc.numPages; i++) {
      if (myGeneration !== activeGeneration) return;
      if (cache.has(i)) continue;
      try {
        await ensureTextContent(i);
      } catch {
        /* one bad page shouldn't kill the warm-up */
      }
      // Yield so canvas/textLayer renders aren't starved.
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  // Re-run when the case-sensitivity toggle flips (and a query is active).
  watch(caseSensitive, () => {
    if (query.value) void runSearch(query.value);
  });

  // Reset everything when the document changes — and start warming the cache.
  watch(
    () => opts.doc.value,
    (d) => {
      cache.clear();
      clear();
      if (d) void warmCache(d);
    },
    { immediate: true },
  );

  const currentMatch = computed<SearchMatch | null>(() => {
    const i = currentIndex.value;
    return i >= 0 && i < matches.value.length ? matches.value[i] : null;
  });

  return {
    query,
    caseSensitive,
    matches,
    currentIndex,
    currentMatch,
    searching,
    setQuery,
    next,
    prev,
    clear,
  };
}
