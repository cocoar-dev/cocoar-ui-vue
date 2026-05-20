/**
 * View-position persistence for CoarDocumentViewer.
 *
 * Two opt-in mechanisms, freely combinable:
 *  - `storageKey` → localStorage-backed save/restore inside the component.
 *  - `position` prop + `update:position` emit → consumer owns persistence
 *    (e.g. server-side per-user state).
 *
 * If both are set, the v-model'd `position` wins on restore; subsequent writes
 * still update both storage and the emit. The composable rate-limits writes so
 * fast scrolling doesn't thrash localStorage or flood the consumer with events.
 */
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowReactive,
} from 'vue';
import type { PageEntry, PageRotation } from './usePageRenderer';
import type { CoarDocumentViewerPosition } from "../CoarDocumentViewer.vue";

export interface UsePositionMemoryOptions {
  storageKey: ComputedRef<string | undefined>;
  /** Consumer-bound position (v-model). When undefined, only storageKey is used. */
  externalPosition: ComputedRef<CoarDocumentViewerPosition | undefined>;
  /** Whether the document is loaded — restore once this turns true. */
  ready: ComputedRef<boolean>;

  scrollContainer: Ref<HTMLElement | null>;
  pages: ShallowReactive<PageEntry[]>;
  visiblePage: Ref<number>;
  scale: Ref<number>;
  rotation: Ref<PageRotation>;

  /** Emit `update:position`. The composable also calls this when storageKey-only. */
  emitPosition: (value: CoarDocumentViewerPosition) => void;
}

const DEBOUNCE_MS = 250;

function readFromStorage(key: string): CoarDocumentViewerPosition | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CoarDocumentViewerPosition>;
    if (
      typeof parsed.page !== 'number' ||
      typeof parsed.pageOffset !== 'number' ||
      typeof parsed.zoom !== 'number' ||
      typeof parsed.rotation !== 'number'
    ) {
      return null;
    }
    return {
      page: parsed.page,
      pageOffset: parsed.pageOffset,
      zoom: parsed.zoom,
      rotation: parsed.rotation as PageRotation,
    };
  } catch {
    // Corrupt entry / disabled storage — fall through to defaults.
    return null;
  }
}

function writeToStorage(key: string, value: CoarDocumentViewerPosition): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — silently skip.
  }
}

export function usePositionMemory(opts: UsePositionMemoryOptions) {
  /**
   * True while we're applying a restored position. Suppresses save-back so that
   * the restore doesn't immediately overwrite itself with intermediate state
   * captured during the scroll animation.
   */
  const restoring = ref(false);
  /** Marker — has any restore attempt run for this doc? */
  const restored = ref(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  /** Last value we wrote out — avoids duplicate emits on no-op deltas. */
  let lastEmitted: string | null = null;

  function computeCurrent(): CoarDocumentViewerPosition | null {
    const container = opts.scrollContainer.value;
    if (!container) return null;
    const idx = opts.visiblePage.value;
    const page = opts.pages[idx];
    if (!page?.wrapper) {
      return {
        page: idx,
        pageOffset: 0,
        zoom: opts.scale.value,
        rotation: opts.rotation.value,
      };
    }
    // Offset of the page wrapper relative to the scroll container's top.
    const wrapperTop = page.wrapper.offsetTop - container.offsetTop;
    const raw = (container.scrollTop - wrapperTop) / Math.max(1, page.displayHeight);
    const clamped = Math.max(0, Math.min(1, raw));
    return {
      page: idx,
      pageOffset: clamped,
      zoom: opts.scale.value,
      rotation: opts.rotation.value,
    };
  }

  function flush() {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (restoring.value) return;
    const current = computeCurrent();
    if (!current) return;
    const sig = JSON.stringify(current);
    if (sig === lastEmitted) return;
    lastEmitted = sig;
    opts.emitPosition(current);
    const key = opts.storageKey.value;
    if (key) writeToStorage(key, current);
  }

  function schedule() {
    if (restoring.value) return;
    if (debounceTimer != null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, DEBOUNCE_MS);
  }

  function scrollToPosition(pos: CoarDocumentViewerPosition): void {
    const container = opts.scrollContainer.value;
    if (!container) return;
    const page = opts.pages[pos.page];
    if (!page?.wrapper) return;
    const wrapperTop = page.wrapper.offsetTop - container.offsetTop;
    container.scrollTop = wrapperTop + pos.pageOffset * page.displayHeight;
  }

  /**
   * Restore state from external (v-model) or storage. Called once the document
   * is ready *and* page wrappers have mounted (so their offsetTop is correct).
   * Skipped if neither source has a value.
   */
  async function restore(): Promise<void> {
    if (restored.value) return;
    if (!opts.ready.value) return;
    if (opts.pages.length === 0) return;

    const fromExternal = opts.externalPosition.value;
    const fromStorage = opts.storageKey.value ? readFromStorage(opts.storageKey.value) : null;
    const source = fromExternal ?? fromStorage;
    if (!source) {
      restored.value = true;
      return;
    }

    restoring.value = true;
    // Apply zoom + rotation first — they affect page layout, which we need to
    // be settled before we scroll to the right offset.
    if (typeof source.zoom === 'number' && Number.isFinite(source.zoom)) {
      opts.scale.value = source.zoom;
    }
    if (
      source.rotation === 0 ||
      source.rotation === 90 ||
      source.rotation === 180 ||
      source.rotation === 270
    ) {
      opts.rotation.value = source.rotation;
    }
    // Wait for layout: two RAFs covers Vue reactivity flush + browser layout.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    scrollToPosition(source);
    // Give the scroll event one tick to settle, then re-enable saves.
    await new Promise<void>((r) => setTimeout(r, 0));
    restoring.value = false;
    restored.value = true;
  }

  // Reset the restore flag whenever the document changes (signal: pages array
  // gets emptied + repopulated).
  watch(
    () => opts.pages.length === 0,
    (isEmpty) => {
      if (isEmpty) {
        restored.value = false;
        lastEmitted = null;
      }
    },
  );

  // Trigger restore once the doc is ready and pages are built.
  watch(
    () => [opts.ready.value, opts.pages.length] as const,
    ([ready, count]) => {
      if (ready && count > 0 && !restored.value) {
        void restore();
      }
    },
  );

  // Save on any meaningful state change (scroll, zoom, rotation, page).
  watch(
    () => [
      opts.visiblePage.value,
      opts.scale.value,
      opts.rotation.value,
    ] as const,
    schedule,
  );

  // Scroll events are high-frequency — listen with passive: true since we
  // don't preventDefault, and rely on the debouncer to coalesce.
  let scrollEl: HTMLElement | null = null;
  function attachScroll() {
    detachScroll();
    const el = opts.scrollContainer.value;
    if (!el) return;
    scrollEl = el;
    el.addEventListener('scroll', schedule, { passive: true });
  }
  function detachScroll() {
    if (scrollEl) {
      scrollEl.removeEventListener('scroll', schedule);
      scrollEl = null;
    }
  }
  watch(() => opts.scrollContainer.value, attachScroll);
  onMounted(attachScroll);
  onBeforeUnmount(() => {
    detachScroll();
    if (debounceTimer != null) clearTimeout(debounceTimer);
  });

  // If the external position is reassigned to a different value while the doc
  // is loaded, apply it (consumer-driven scroll). Compare to currently emitted
  // value to avoid the obvious ping-pong.
  watch(
    () => opts.externalPosition.value,
    (next) => {
      if (!next || !opts.ready.value || !restored.value) return;
      const cur = computeCurrent();
      if (cur && JSON.stringify(cur) === JSON.stringify(next)) return;
      restoring.value = true;
      opts.scale.value = next.zoom;
      opts.rotation.value = next.rotation;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToPosition(next);
          setTimeout(() => {
            restoring.value = false;
          }, 0);
        });
      });
    },
  );

  return {
    /** Current view position, recomputed on demand (not reactive). */
    current: computed(() => computeCurrent()),
    /** Force a save right now (e.g. on explicit user action). */
    flush,
  };
}
