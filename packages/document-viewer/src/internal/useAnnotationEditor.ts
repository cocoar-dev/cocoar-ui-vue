/**
 * Annotation creation + selection logic for CoarDocumentViewer.
 *
 * Watches mode + scroll-container mouse events to translate gestures into
 * `annotation:create` payloads:
 *  - `'highlight'` mode: mouseup with a non-empty native text selection inside
 *    a page wrapper → emit one highlight per page, with the selection's client
 *    rects normalised to 0..1 page coords.
 *  - `'comment'` mode: click on a page wrapper → open a draft popover anchored
 *    to the click; on Save the composable emits the create payload.
 *
 * Also tracks `selectedAnnotationId` so existing annotations can be edited via
 * the same popover; AnnotationLayer emits `annotation-click` to set this.
 *
 * Coordinate convention: x grows right, y grows down (CSS-style), normalised
 * against the page's `displayWidth` × `displayHeight`.
 */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { PageEntry } from './usePageRenderer';
import type {
  CoarPdfAnnotation,
  CoarPdfAnnotationCreatePayload,
  CoarPdfAnnotationMode,
  CoarPdfAnnotationUpdatePayload,
  CoarPdfFreetextAnnotation,
  CoarPdfInkAnnotation,
  CoarPdfMarkerAnnotation,
  CoarPdfPoint,
  CoarPdfRect,
} from '../types';

export interface DraftPin {
  /** Page index the click landed on. */
  pageIndex: number;
  /** Anchor in normalised page coords. */
  anchor: CoarPdfPoint;
  /** Click position in viewport coords — used as the popover anchor. */
  viewportRect: DOMRect;
  /** Initial color (palette[0]). */
  color: string;
}

export interface DraftFreetext {
  pageIndex: number;
  /** Rect in normalised page coords. */
  rect: CoarPdfRect;
  /** Popover anchor (viewport coords). */
  viewportRect: DOMRect;
  /** Initial color (palette[0]). */
  color: string;
}

export interface DraftInk {
  /** Which final annotation type this draft will commit as. */
  kind: 'ink' | 'marker';
  pageIndex: number;
  /** Live strokes — each entry is a polyline of normalised points. */
  strokes: CoarPdfPoint[][];
  /** Stroke width in CSS pixels at zoom=1. */
  width: number;
  color: string;
  /**
   * When set, the draft will commit as an `annotation:update` that APPENDS
   * its (sole) stroke to the named annotation's existing `strokes` array,
   * instead of emitting a fresh `annotation:create`. Activated by holding
   * Shift on pointerdown while a previous marker/ink annotation of the same
   * kind exists on the same page.
   */
  appendToId?: string;
}

/**
 * Snapshot taken at pointerdown when starting a translate-drag on an existing
 * annotation in `'select'` mode. The wrapper rect lets us convert raw pointer
 * delta into normalised page-space delta.
 */
export interface DraftMove {
  id: string;
  pageIndex: number;
  /** Page wrapper dimensions in CSS pixels (used to normalise the delta). */
  wrapperWidth: number;
  wrapperHeight: number;
  /** Pointer position at drag-start, viewport coords. */
  startX: number;
  startY: number;
  /** Live normalised offset since drag-start; written into the rendered position. */
  dx: number;
  dy: number;
}

export interface UseAnnotationEditorOptions {
  mode: ComputedRef<CoarPdfAnnotationMode>;
  annotations: ComputedRef<readonly CoarPdfAnnotation[]>;
  pages: { value: readonly PageEntry[] } | { length: number; [i: number]: PageEntry };
  scrollContainer: Ref<HTMLElement | null>;
  /** Palette — first entry is the default color for new annotations. */
  colors: ComputedRef<readonly string[]>;
  emitCreate: (payload: CoarPdfAnnotationCreatePayload) => void;
  emitUpdate: (payload: CoarPdfAnnotationUpdatePayload) => void;
  emitDelete: (id: string) => void;
}

/** Find the page wrapper element under a viewport point, plus its 0-based index. */
function findPage(
  pages: readonly PageEntry[],
  el: Element | null,
): { idx: number; page: PageEntry; wrapper: HTMLElement } | null {
  if (!el) return null;
  const wrapper = (el as HTMLElement).closest<HTMLElement>('.coar-pdf-page');
  if (!wrapper) return null;
  const idxAttr = wrapper.dataset.pageIndex;
  if (idxAttr == null) return null;
  const idx = Number(idxAttr);
  const page = pages[idx];
  if (!page) return null;
  return { idx, page, wrapper };
}

/** Default stroke widths per drawing mode (CSS px at zoom=1). */
const DEFAULT_INK_WIDTH = 3;
const DEFAULT_MARKER_WIDTH = 18;
/** Default freetext font size (CSS px at zoom=1). */
const DEFAULT_FREETEXT_FONT_SIZE = 14;
/** Default freetext rect dimensions in normalised page coords. */
const DEFAULT_FREETEXT_W = 0.25;
const DEFAULT_FREETEXT_H = 0.06;

/** Preset stroke widths for the in-toolbar thickness picker. */
export const INK_WIDTH_PRESETS = [1.5, 3, 6] as const;
export const MARKER_WIDTH_PRESETS = [10, 18, 30] as const;

export function useAnnotationEditor(opts: UseAnnotationEditorOptions) {
  const selectedAnnotationId = ref<string | null>(null);
  const draftPin = ref<DraftPin | null>(null);
  const draftFreetext = ref<DraftFreetext | null>(null);
  const draftInk = ref<DraftInk | null>(null);
  const draftMove = ref<DraftMove | null>(null);

  /**
   * Id + kind of the most recently-created marker/ink annotation, scoped to
   * the page it landed on. Used by Shift+drag in marker/ink mode to append
   * a fresh stroke to the previous annotation instead of starting a new one.
   *
   * Cleared on every mode change, so each entry into a draw mode starts a
   * fresh annotation by default — a deliberate "first stroke always creates"
   * rule that keeps the modifier behavior predictable.
   */
  const lastCreated = ref<{ id: string; kind: 'ink' | 'marker'; pageIndex: number } | null>(null);

  /**
   * Active stroke parameters per drawing mode. The toolbar's config bar
   * mutates these so a width/color change applies to the next stroke; the
   * pointerdown handler reads them when starting a draft.
   */
  const inkWidth = ref(DEFAULT_INK_WIDTH);
  const inkColor = ref<string>('');
  const markerWidth = ref(DEFAULT_MARKER_WIDTH);
  const markerColor = ref<string>('');

  function getPages(): readonly PageEntry[] {
    // The composable accepts ShallowReactive arrays (pages from usePageRenderer)
    // — index access is what we need.
    return opts.pages as readonly PageEntry[];
  }

  function onClick(e: MouseEvent) {
    const mode = opts.mode.value;
    if (mode !== 'comment' && mode !== 'freetext') return;
    // Annotation-layer clicks bubble up too; we let those select the annotation
    // (handled by AnnotationLayer emit) rather than creating a new annotation on top.
    if ((e.target as HTMLElement | null)?.closest('[data-annotation-id]')) return;
    const hit = findPage(getPages(), e.target as Element | null);
    if (!hit) return;
    const { idx, wrapper } = hit;
    const rect = wrapper.getBoundingClientRect();
    const xn = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const yn = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));
    const viewportRect = new DOMRect(e.clientX, e.clientY, 1, 1);

    if (mode === 'comment') {
      draftPin.value = {
        pageIndex: idx,
        anchor: { x: xn, y: yn },
        viewportRect,
        color: opts.colors.value[0] ?? '#2563eb',
      };
    } else {
      // 'freetext' — drop a default-sized rect centred on the click, clamped
      // inside the page so the popover anchor and the rect both stay visible.
      const w = DEFAULT_FREETEXT_W;
      const h = DEFAULT_FREETEXT_H;
      draftFreetext.value = {
        pageIndex: idx,
        rect: {
          x: Math.max(0, Math.min(1 - w, xn - w / 2)),
          y: Math.max(0, Math.min(1 - h, yn - h / 2)),
          w,
          h,
        },
        viewportRect,
        color: opts.colors.value[0] ?? '#16a34a',
      };
    }
  }

  /* ---- Ink drawing ---------------------------------------------------- */
  /** Page wrapper the in-progress ink is being drawn on (for normalisation). */
  let inkWrapper: HTMLElement | null = null;

  function pushInkPoint(e: PointerEvent): void {
    if (!draftInk.value || !inkWrapper) return;
    const rect = inkWrapper.getBoundingClientRect();
    const raw: CoarPdfPoint = {
      x: clamp01((e.clientX - rect.left) / Math.max(1, rect.width)),
      y: clamp01((e.clientY - rect.top) / Math.max(1, rect.height)),
    };
    const strokes = draftInk.value.strokes;
    const current = strokes[strokes.length - 1];
    // Constrain modifiers, read live so the user can toggle mid-drag:
    //   Ctrl / Cmd                 → straight line, free angle
    //   Shift (alone or with Ctrl) → straight line, snapped to 15°
    // Either modifier collapses the in-flight stroke to a single segment
    // from the drag anchor (the first point) to the current cursor;
    // releasing the modifier falls back to freehand from the last endpoint.
    const constrain = e.shiftKey || e.ctrlKey || e.metaKey;
    if (constrain && current.length >= 1) {
      const start = current[0];
      const target = e.shiftKey ? snapAngle(start, raw) : raw;
      strokes[strokes.length - 1] = [start, target];
    } else {
      current.push(raw);
    }
    // Triggers reactivity on draftInk for the live preview.
    draftInk.value = { ...draftInk.value, strokes: strokes.slice() };
  }

  function onPointerDown(e: PointerEvent) {
    const mode = opts.mode.value;
    if (mode === 'select') {
      onSelectPointerDown(e);
      return;
    }
    if (mode === 'eraser') {
      onEraserPointerDown(e);
      return;
    }
    if (mode !== 'ink' && mode !== 'marker') return;
    if (e.button !== 0) return;
    // Skip if the user is clicking an existing annotation — UNLESS Alt is
    // held, which means "append a new stroke to the previous annotation"
    // (the previous annotation IS what the user is starting the drag on).
    // Without this carve-out the early-return would swallow Alt-drag started
    // on top of the existing stroke and append would silently never fire.
    if (
      !e.altKey &&
      (e.target as HTMLElement | null)?.closest('[data-annotation-id]')
    ) {
      return;
    }
    const hit = findPage(getPages(), e.target as Element | null);
    if (!hit) return;
    inkWrapper = hit.wrapper;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const isMarker = mode === 'marker';
    // Alt+drag while there's a matching previous annotation on this page
    // appends the new stroke to it (an `annotation:update`) instead of
    // creating a new one. Shift is reserved for the straight-line constraint
    // (Photoshop convention) so Alt picks up the append role. Width/color
    // come from the existing annotation so appended strokes blend in.
    const appendTarget =
      e.altKey &&
      lastCreated.value &&
      lastCreated.value.pageIndex === hit.idx &&
      lastCreated.value.kind === (isMarker ? 'marker' : 'ink')
        ? opts.annotations.value.find((a) => a.id === lastCreated.value!.id)
        : undefined;
    const matched =
      appendTarget && (appendTarget.type === 'ink' || appendTarget.type === 'marker')
        ? (appendTarget as CoarPdfInkAnnotation | CoarPdfMarkerAnnotation)
        : undefined;
    draftInk.value = {
      kind: isMarker ? 'marker' : 'ink',
      pageIndex: hit.idx,
      strokes: [[]],
      width: matched?.width ?? (isMarker ? markerWidth.value : inkWidth.value),
      color:
        matched?.color ||
        (isMarker ? markerColor.value : inkColor.value) ||
        opts.colors.value[0] ||
        (isMarker ? '#fde68a' : '#dc2626'),
      appendToId: matched?.id,
    };
    pushInkPoint(e);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    if (!draftInk.value) return;
    pushInkPoint(e);
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    const d = draftInk.value;
    inkWrapper = null;
    draftInk.value = null;
    if (!d) return;
    // Drop strokes with fewer than 2 points (accidental clicks).
    const strokes = d.strokes.filter((s) => s.length >= 2);
    if (strokes.length === 0) return;
    if (d.appendToId) {
      // Shift-append: extend the existing annotation's `strokes`.
      const existing = opts.annotations.value.find((a) => a.id === d.appendToId);
      if (existing && (existing.type === 'ink' || existing.type === 'marker')) {
        const stroked = existing as CoarPdfInkAnnotation | CoarPdfMarkerAnnotation;
        opts.emitUpdate({
          id: existing.id,
          patch: { strokes: [...stroked.strokes, ...strokes] },
        });
        return;
      }
      // Target vanished (e.g. consumer deleted it before pointerup) — fall
      // through to a fresh create so the stroke isn't silently lost.
    }
    opts.emitCreate({
      type: d.kind,
      pageIndex: d.pageIndex,
      color: d.color,
      width: d.width,
      strokes,
    });
  }

  function commitDraftFreetext(text: string, color: string) {
    const d = draftFreetext.value;
    if (!d) return;
    if (!text.trim()) {
      draftFreetext.value = null;
      return;
    }
    opts.emitCreate({
      type: 'freetext',
      pageIndex: d.pageIndex,
      color,
      rect: d.rect,
      text,
      fontSize: DEFAULT_FREETEXT_FONT_SIZE,
    });
    draftFreetext.value = null;
  }

  function cancelDraftFreetext() {
    draftFreetext.value = null;
  }

  /** Promote the current draft into a real comment annotation. */
  function commitDraftPin(comment: string, color: string) {
    const d = draftPin.value;
    if (!d) return;
    opts.emitCreate({
      type: 'comment',
      pageIndex: d.pageIndex,
      anchor: d.anchor,
      color,
      comment,
    });
    draftPin.value = null;
  }

  function cancelDraftPin() {
    draftPin.value = null;
  }

  /* ---- Select / move existing -------------------------------------- */

  /**
   * The DOM element being translated during the current move-drag. We
   * imperatively set its `transform` while the pointer moves; on pointerup
   * the composable emits an `annotation:update` and clears the transform so
   * the consumer's re-render lands cleanly in the same spot.
   */
  let moveEl: HTMLElement | SVGGraphicsElement | null = null;

  /** Find the data-annotation-id wrapper element under a click target. */
  function findAnnotationEl(target: Element | null): {
    el: HTMLElement | SVGGraphicsElement;
    id: string;
  } | null {
    if (!target) return null;
    const el = (target as Element).closest<HTMLElement | SVGGraphicsElement>(
      '[data-annotation-id]',
    );
    if (!el) return null;
    const id = el.dataset?.annotationId ?? (el.getAttribute?.('data-annotation-id') ?? '');
    if (!id) return null;
    return { el, id };
  }

  function onSelectPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const annoEl = findAnnotationEl(e.target as Element);
    if (!annoEl) {
      // Click on empty page area — clear selection.
      selectedAnnotationId.value = null;
      return;
    }
    const annotation = opts.annotations.value.find((a) => a.id === annoEl.id);
    if (!annotation) return;
    const hit = findPage(getPages(), e.target as Element | null);
    if (!hit) return;
    e.preventDefault();
    selectedAnnotationId.value = annoEl.id;
    moveEl = annoEl.el;
    const wrapperRect = hit.wrapper.getBoundingClientRect();
    draftMove.value = {
      id: annoEl.id,
      pageIndex: hit.idx,
      wrapperWidth: wrapperRect.width,
      wrapperHeight: wrapperRect.height,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove', onMovePointerMove);
    window.addEventListener('pointerup', onMovePointerUp);
    window.addEventListener('pointercancel', onMovePointerUp);
  }

  function onMovePointerMove(e: PointerEvent) {
    const d = draftMove.value;
    if (!d || !moveEl) return;
    const dxPx = e.clientX - d.startX;
    const dyPx = e.clientY - d.startY;
    d.dx = dxPx / Math.max(1, d.wrapperWidth);
    d.dy = dyPx / Math.max(1, d.wrapperHeight);
    // CSS transform works on both HTMLElement and SVGGraphicsElement in
    // modern browsers. We keep a single source-of-truth (the original
    // annotation's coords) and only apply the visual delta here.
    (moveEl as HTMLElement).style.transform = `translate(${dxPx}px, ${dyPx}px)`;
  }

  function onMovePointerUp() {
    window.removeEventListener('pointermove', onMovePointerMove);
    window.removeEventListener('pointerup', onMovePointerUp);
    window.removeEventListener('pointercancel', onMovePointerUp);
    const d = draftMove.value;
    const el = moveEl;
    moveEl = null;
    draftMove.value = null;
    if (!d || !el) return;
    // Clear the temporary visual offset before emitting; the consumer's
    // update lands in the same place on next render.
    el.style.transform = '';
    // Ignore micro-drags (treat as click → selection only).
    if (Math.abs(d.dx) < 1e-4 && Math.abs(d.dy) < 1e-4) return;
    const annotation = opts.annotations.value.find((a) => a.id === d.id);
    if (!annotation) return;
    const patch = translateAnnotation(annotation, d.dx, d.dy);
    if (patch) opts.emitUpdate({ id: d.id, patch });
  }

  /* ---- Eraser ------------------------------------------------------- */

  function onEraserPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const annoEl = findAnnotationEl(e.target as Element);
    if (!annoEl) return;
    e.preventDefault();
    const annotation = opts.annotations.value.find((a) => a.id === annoEl.id);
    if (!annotation) return;
    if (annotation.type === 'ink' || annotation.type === 'marker') {
      // For multi-stroke annotations, erase the specific polyline that was
      // hit (DOM attribute `data-stroke-index` set by AnnotationLayer).
      // Falling back to whole-annotation delete when the index is absent.
      const strokeAttr =
        (e.target as Element).closest?.<HTMLElement | SVGGraphicsElement>('[data-stroke-index]')
          ?.dataset?.strokeIndex ?? null;
      const stroked = annotation as CoarPdfInkAnnotation | CoarPdfMarkerAnnotation;
      if (strokeAttr !== null && stroked.strokes.length > 1) {
        const i = Number(strokeAttr);
        const next = stroked.strokes.filter((_, idx) => idx !== i);
        opts.emitUpdate({ id: annotation.id, patch: { strokes: next } });
        return;
      }
    }
    opts.emitDelete(annotation.id);
    if (selectedAnnotationId.value === annotation.id) selectedAnnotationId.value = null;
  }

  function selectAnnotation(id: string | null) {
    selectedAnnotationId.value = id;
    // Selecting an existing annotation also kills any draft.
    if (id) draftPin.value = null;
  }

  /** Resolve the currently-selected annotation, if it still exists in the list. */
  const selectedAnnotation = computed<CoarPdfAnnotation | null>(() => {
    const id = selectedAnnotationId.value;
    if (!id) return null;
    return opts.annotations.value.find((a) => a.id === id) ?? null;
  });

  // Attach/detach listeners on the scroll container.
  let attachedEl: HTMLElement | null = null;
  function attach() {
    detach();
    const el = opts.scrollContainer.value;
    if (!el) return;
    attachedEl = el;
    el.addEventListener('click', onClick);
    el.addEventListener('pointerdown', onPointerDown);
  }
  function detach() {
    if (attachedEl) {
      attachedEl.removeEventListener('click', onClick);
      attachedEl.removeEventListener('pointerdown', onPointerDown);
      attachedEl = null;
    }
    // Drop any window-level listeners from an in-flight ink draw or move.
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('pointermove', onMovePointerMove);
    window.removeEventListener('pointerup', onMovePointerUp);
    window.removeEventListener('pointercancel', onMovePointerUp);
  }
  watch(() => opts.scrollContainer.value, attach, { immediate: true });

  // Switching mode clears any in-flight draft + selection — easier to reason about.
  watch(
    () => opts.mode.value,
    () => {
      draftPin.value = null;
      draftFreetext.value = null;
      draftInk.value = null;
      if (moveEl) {
        (moveEl as HTMLElement).style.transform = '';
        moveEl = null;
      }
      draftMove.value = null;
      // Leaving a draw mode resets the multi-stroke append target — entering
      // a draw mode always starts a fresh annotation.
      lastCreated.value = null;
      selectedAnnotationId.value = null;
    },
  );

  /**
   * Track newly-added marker/ink annotations so Shift+drag knows which one
   * to append to. We compare ids across changes; the last added stroked
   * annotation wins.
   */
  let lastSeenIds = new Set<string>();
  watch(
    () => opts.annotations.value,
    (cur) => {
      const added: CoarPdfAnnotation[] = [];
      for (const a of cur) {
        if (!lastSeenIds.has(a.id)) added.push(a);
      }
      lastSeenIds = new Set(cur.map((a) => a.id));
      for (let i = added.length - 1; i >= 0; i--) {
        const a = added[i];
        if (a.type === 'ink' || a.type === 'marker') {
          lastCreated.value = { id: a.id, kind: a.type, pageIndex: a.pageIndex };
          return;
        }
      }
    },
    { immediate: true },
  );

  return {
    selectedAnnotationId,
    selectedAnnotation,
    selectAnnotation,
    draftPin,
    commitDraftPin,
    cancelDraftPin,
    draftFreetext,
    commitDraftFreetext,
    cancelDraftFreetext,
    draftInk,
    draftMove,
    inkWidth,
    inkColor,
    markerWidth,
    markerColor,
    detach,
  };
}

/**
 * Compute the patch that translates an annotation by `(dx, dy)` in normalised
 * page coords. Returns `null` for unsupported types (none currently — all
 * four annotation kinds are movable).
 */
function translateAnnotation(
  a: CoarPdfAnnotation,
  dx: number,
  dy: number,
): Partial<CoarPdfAnnotation> | null {
  switch (a.type) {
    case 'comment':
      return {
        anchor: { x: clamp01(a.anchor.x + dx), y: clamp01(a.anchor.y + dy) },
      };
    case 'freetext': {
      const ft = a as CoarPdfFreetextAnnotation;
      // Clamp so the rect stays inside the page after the translate.
      const maxX = Math.max(0, 1 - ft.rect.w);
      const maxY = Math.max(0, 1 - ft.rect.h);
      return {
        rect: {
          x: Math.max(0, Math.min(maxX, ft.rect.x + dx)),
          y: Math.max(0, Math.min(maxY, ft.rect.y + dy)),
          w: ft.rect.w,
          h: ft.rect.h,
        },
      };
    }
    case 'ink':
    case 'marker': {
      const stroked = a as CoarPdfInkAnnotation | CoarPdfMarkerAnnotation;
      const next = stroked.strokes.map((s) =>
        s.map((p) => ({ x: clamp01(p.x + dx), y: clamp01(p.y + dy) })),
      );
      return { strokes: next };
    }
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Angle granularity for the Shift-constrained snap. 15° → 24 directions. */
const SNAP_STEP_RADIANS = Math.PI / 12;

/**
 * Snap a point to the nearest {@link SNAP_STEP_RADIANS} increment around an
 * anchor — used to constrain Shift-held draws to a set of regularly spaced
 * angles. The snap is performed in normalized page coordinates and preserves
 * the cursor's distance from the anchor along the snapped direction.
 */
function snapAngle(start: CoarPdfPoint, p: CoarPdfPoint): CoarPdfPoint {
  const dx = p.x - start.x;
  const dy = p.y - start.y;
  if (dx === 0 && dy === 0) return p;
  const angle = Math.atan2(dy, dx);
  const snappedAngle = Math.round(angle / SNAP_STEP_RADIANS) * SNAP_STEP_RADIANS;
  const len = Math.hypot(dx, dy);
  return {
    x: clamp01(start.x + Math.cos(snappedAngle) * len),
    y: clamp01(start.y + Math.sin(snappedAngle) * len),
  };
}
