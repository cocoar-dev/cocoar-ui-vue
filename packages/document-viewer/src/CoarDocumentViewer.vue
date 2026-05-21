<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useDocumentLoader } from './internal/useDocumentLoader';
import { usePageRenderer, type PageRotation } from './internal/usePageRenderer';
import { usePositionMemory } from './internal/usePositionMemory';
import {
  useAnnotationEditor,
  INK_WIDTH_PRESETS,
  MARKER_WIDTH_PRESETS,
} from './internal/useAnnotationEditor';
import { usePdfSearch, type SearchMatch } from './internal/usePdfSearch';
import DocumentToolbar from './internal/DocumentToolbar.vue';
import DocumentSearchBar from './internal/DocumentSearchBar.vue';
import DocumentSidebar from './internal/DocumentSidebar.vue';
import DocumentAnnotationPanel from './internal/DocumentAnnotationPanel.vue';
import AnnotationLayer from './internal/AnnotationLayer.vue';
import AnnotationPopover, {
  type AnnotationPopoverPayload,
} from './internal/AnnotationPopover.vue';

export type CoarDocumentViewerToolbarPosition = 'left' | 'right' | 'top' | 'bottom';
import type {
  CoarPdfAnnotation,
  CoarPdfAnnotationMode,
  CoarPdfAnnotationCreatePayload,
  CoarPdfAnnotationUpdatePayload,
  CoarDocumentViewerTool,
} from './types';
import type { DocumentSource } from './source-types';

/**
 * Zoom level ladder for the +/- buttons. Roughly 1.15× between adjacent steps
 * (≈ a quarter-octave each), so the user can land on a comfortable size without
 * jumping in 50% increments. Ctrl+wheel zoom stays continuous (1.1× per notch).
 */
const ZOOM_LEVELS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4,
] as const;
const MIN_ZOOM = ZOOM_LEVELS[0];
const MAX_ZOOM = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
/** Padding inside the scroll viewport when computing fit-to-width / fit-to-page. */
const FIT_PADDING = 32;

export interface CoarDocumentViewerPosition {
  /** 0-based page index currently in view. */
  page: number;
  /** Fractional scroll offset inside the page, 0..1. */
  pageOffset: number;
  /** Zoom factor, 1 = 100%. */
  zoom: number;
  /** Rotation in degrees, multiples of 90. */
  rotation: 0 | 90 | 180 | 270;
}

export interface CoarDocumentViewerErrorEvent {
  /** Original error thrown by pdfjs. */
  error: unknown;
  /** Source URL that failed, if available. */
  src?: string;
}

/**
 * UI strings. English defaults are baked in; pass any subset to override.
 * `{n}` / `{total}` / `{current}` placeholders are substituted at render time.
 */
export interface CoarDocumentViewerLabels {
  loading?: string;
  errorTitle?: string;
  errorRetry?: string;
  pageOf?: string;
  pageJumpAria?: string;
  prevPage?: string;
  nextPage?: string;
  zoomIn?: string;
  zoomOut?: string;
  /** Tooltip / aria-label for the percent readout button (click = reset to 100%). */
  resetZoom?: string;
  /** Tooltip / aria-label for the editable zoom-level input. */
  zoomLevel?: string;
  fitWidth?: string;
  fitPage?: string;
  resetView?: string;
  pan?: string;
  rotateCw?: string;
  rotateCcw?: string;
  search?: string;
  searchNext?: string;
  searchPrev?: string;
  searchMatchOf?: string;
  thumbnails?: string;
  outline?: string;
  print?: string;
  download?: string;
  annotationsPanel?: string;
  noAnnotations?: string;
  noMatchingAnnotations?: string;
  searchAnnotations?: string;
  filterBy?: string;
  sortBy?: string;
  sortByPage?: string;
  sortChronological?: string;
  pagePrefix?: string;
  justNow?: string;
  moreActions?: string;
  modeView?: string;
  modeSelect?: string;
  modeEraser?: string;
  modeMarker?: string;
  modeNote?: string;
  modeInk?: string;
  modeFreetext?: string;
  /** Label for the in-toolbar stroke-width picker. */
  strokeWidth?: string;
  annotationDelete?: string;
  annotationEditComment?: string;
  annotationColor?: string;
  /** Appended to a tool's tooltip when the source's capabilities don't support it. */
  notAvailableForSource?: string;
  /** Section title in the right panel (`'Info'` by default). */
  infoSection?: string;
  /** Row labels in the Info section. */
  infoFormat?: string;
  infoPages?: string;
  /** Per-page dimensions row prefix — appears as `"Page 1: 612 × 792 pt"`. */
  infoPage?: string;
  infoSize?: string;
  infoTitle?: string;
  infoAuthor?: string;
  infoSubject?: string;
  infoKeywords?: string;
  infoCreator?: string;
  infoProducer?: string;
  infoCreated?: string;
  infoModified?: string;
  infoPdfVersion?: string;
}

export interface CoarDocumentViewerProps {
  /**
   * The document to render. Build via one of the source factories:
   *   - `pdfSource({ url, headers?, withCredentials? })` from
   *     `@cocoar/vue-document-viewer/pdf`
   *   - `imageSource({ url })` (coming in iteration 2)
   *
   * Switching sources (e.g. user clicks a different attachment) keeps the
   * surrounding component mounted: the toolbar, panels, and viewport stay,
   * only the page renderer rebinds. The toolbar greys out tools that the
   * new source doesn't support via `source.capabilities`.
   */
  source: DocumentSource;
  /** Show the toolbar chrome. Default: true. */
  showToolbar?: boolean;
  /** Show the thumbnails sidebar tab. Default: false. */
  showThumbnails?: boolean;
  /** Show the outline (TOC) sidebar tab if the PDF has one. Default: false. */
  showOutline?: boolean;
  /**
   * Show the right-side annotations list panel. Default: false.
   *
   * The panel lists every annotation in the document with filter, search,
   * and sort controls. Clicking an entry selects the annotation and scrolls
   * to it. Inline 3-dot menu offers delete.
   */
  showAnnotationsPanel?: boolean;
  /**
   * Show the source-info section at the top of the annotations panel. Default: true.
   *
   * The section renders format, page count, current-page dimensions, and any
   * PDF metadata the document carries (title, author, creator, etc.) — empty
   * fields are skipped. Only shown when `showAnnotationsPanel` is true and the
   * source has resolved its info (i.e. `status === 'ready'`).
   */
  showInfoSection?: boolean;
  /** Show the search input in the toolbar. Default: true. */
  showSearch?: boolean;
  /** Show print + download buttons in the toolbar. Default: false. */
  showPrintDownload?: boolean;
  /** Show the annotation-mode button group in the toolbar. Default: true. */
  showAnnotationModes?: boolean;
  /**
   * Where the toolbar sits. `'top'` (default) is a horizontal bar above the
   * document; `'left'`/`'right'` are vertical rails flanking it; `'bottom'`
   * pins it below. Matches `@cocoar/vue-markdown-editor`'s `toolbarPosition`
   * shape so the two viewers can share visual chrome decisions.
   */
  toolbarPosition?: CoarDocumentViewerToolbarPosition;
  /**
   * Persist view position (page, scroll offset, zoom, rotation) in localStorage
   * under this key. Mutually compatible with `v-model:position` — when both are
   * present, the bound position wins on mount.
   */
  storageKey?: string;
  /** Two-way bound view position. Consumer owns persistence. */
  position?: CoarDocumentViewerPosition;
  /**
   * Whitelist of toolbar tools. When omitted, all tools are shown. When set,
   * only the listed tools render (in fixed canonical order — passing order
   * does not influence button order; see `COAR_DOCUMENT_VIEWER_ALL_TOOLS`). The
   * coarse-grained `showSearch` / `showPrintDownload` / `showAnnotationModes`
   * props still apply as section-level toggles on top of this whitelist;
   * pass them as `false` for the equivalent shorthand.
   */
  tools?: CoarDocumentViewerTool[];
  /** Annotations to render on top of the PDF. */
  annotations?: CoarPdfAnnotation[];
  /** Current annotation interaction mode. Default: 'view' (read-only). */
  annotationMode?: CoarPdfAnnotationMode;
  /** Palette shown in the annotation color picker. */
  annotationColors?: string[];
  /** UI string overrides. English defaults are baked in. */
  labels?: CoarDocumentViewerLabels;
}

const props = withDefaults(defineProps<CoarDocumentViewerProps>(), {
  showToolbar: true,
  showThumbnails: false,
  showOutline: false,
  showAnnotationsPanel: false,
  showInfoSection: true,
  showSearch: true,
  showPrintDownload: false,
  showAnnotationModes: true,
  toolbarPosition: 'top',
  storageKey: undefined,
  position: undefined,
  tools: undefined,
  annotations: () => [],
  annotationMode: 'view',
  annotationColors: () => [
    // Pastels — pleasant in multiply blend over text.
    '#fde68a', // yellow
    '#fca5a5', // pink
    '#86efac', // green
    '#93c5fd', // blue
    '#c4b5fd', // purple
    // Brights / neons — for users who want a screaming highlighter.
    '#facc15', // saturated yellow
    '#ec4899', // hot pink
  ],
  labels: () => ({}),
});

const emit = defineEmits<{
  (e: 'update:position', value: CoarDocumentViewerPosition): void;
  (e: 'update:annotationMode', value: CoarPdfAnnotationMode): void;
  (e: 'annotation:create', payload: CoarPdfAnnotationCreatePayload): void;
  (e: 'annotation:update', payload: CoarPdfAnnotationUpdatePayload): void;
  (e: 'annotation:delete', id: string): void;
  (e: 'error', payload: CoarDocumentViewerErrorEvent): void;
}>();

/**
 * Panel state — `v-model:sidebar-open` (left rail: thumbnails / outline) and
 * `v-model:annotations-panel-open` (right rail). Both default to `false`.
 *
 * Bind these if you want the panel state to **persist across file changes**
 * (e.g. inside a file-explorer shell where the user opens the left rail once
 * and expects it to stay open when they click another file): hold the refs
 * outside the v-if branch that mounts CoarDocumentViewer and pass them in.
 * Without v-model, the state is internal and resets every time the component
 * remounts.
 */
const sidebarOpen = defineModel<boolean>('sidebarOpen', { default: false });
const annotationsPanelOpen = defineModel<boolean>('annotationsPanelOpen', { default: false });

defineSlots<{
  loading(): unknown;
  error(props: { error: unknown; retry: () => void }): unknown;
}>();

const DEFAULT_LABELS: Required<CoarDocumentViewerLabels> = {
  loading: 'Loading PDF…',
  errorTitle: 'Could not load the PDF.',
  errorRetry: 'Retry',
  pageOf: 'Page {current} of {total}',
  pageJumpAria: 'Jump to page',
  prevPage: 'Previous page',
  nextPage: 'Next page',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetZoom: 'Reset zoom to 100%',
  zoomLevel: 'Zoom level (%)',
  fitWidth: 'Fit to width',
  fitPage: 'Fit to page',
  resetView: 'Reset zoom & rotation',
  pan: 'Pan (hand tool)',
  rotateCw: 'Rotate clockwise',
  rotateCcw: 'Rotate counter-clockwise',
  search: 'Search',
  searchNext: 'Next match',
  searchPrev: 'Previous match',
  searchMatchOf: '{current} of {total}',
  thumbnails: 'Thumbnails',
  outline: 'Outline',
  print: 'Print',
  download: 'Download',
  annotationsPanel: 'Annotations',
  noAnnotations: 'No annotations yet',
  noMatchingAnnotations: 'No annotations match the current filter',
  searchAnnotations: 'Search annotations…',
  filterBy: 'Filter by type',
  sortBy: 'Sort by',
  sortByPage: 'By page',
  sortChronological: 'Chronological',
  pagePrefix: 'Page',
  justNow: 'now',
  moreActions: 'More actions',
  modeView: 'View',
  modeSelect: 'Select — drag to move (Alt+drag a marker/pen to extend it; Ctrl+drag = straight line, Shift+drag = straight + snap to 15°)',
  modeEraser: 'Eraser — click a stroke to remove it',
  modeMarker: 'Marker',
  modeNote: 'Note',
  modeInk: 'Draw',
  modeFreetext: 'Text',
  strokeWidth: 'Stroke width',
  annotationDelete: 'Delete',
  annotationEditComment: 'Edit comment',
  annotationColor: 'Color',
  notAvailableForSource: 'not available for this file',
  infoSection: 'Info',
  infoFormat: 'Format',
  infoPages: 'Pages',
  infoPage: 'Page',
  infoSize: 'Size',
  infoTitle: 'Title',
  infoAuthor: 'Author',
  infoSubject: 'Subject',
  infoKeywords: 'Keywords',
  infoCreator: 'Creator',
  infoProducer: 'Producer',
  infoCreated: 'Created',
  infoModified: 'Modified',
  infoPdfVersion: 'PDF version',
};

const labels = computed<Required<CoarDocumentViewerLabels>>(() => ({
  ...DEFAULT_LABELS,
  ...props.labels,
}));

// Rendering state. `scale` is driven by the toolbar (zoom buttons, Ctrl+wheel,
// fit-to-X presets); rotation is wired to the toolbar in Task #11.
const scale = ref(1);
const rotation = ref<PageRotation>(0);
const scrollContainer = ref<HTMLDivElement | null>(null);

/**
 * Pointer interaction mode. `'select'` is text-selection (default). `'pan'` is
 * a drag-to-scroll "hand tool" like Acrobat — useful at high zoom where the
 * scrollbars are tiny. The textLayer's `pointer-events` get switched off in
 * pan mode so the drag isn't hijacked by span hit-testing.
 */
const pointerMode = ref<'select' | 'pan'>('select');
const panning = ref(false);

const sourceRef = computed(() => props.source);
const { status, pdfDoc, pageProviders, info, error, retry, destroy } = useDocumentLoader(sourceRef);

const renderer = usePageRenderer({
  pageProviders,
  scale,
  rotation,
  scrollContainer,
});

const pageCount = computed(() => renderer.pages.length);

usePositionMemory({
  storageKey: computed(() => props.storageKey),
  externalPosition: computed(() => props.position),
  ready: computed(() => status.value === 'ready'),
  scrollContainer,
  pages: renderer.pages,
  visiblePage: renderer.visiblePage,
  scale,
  rotation,
  emitPosition: (value) => emit('update:position', value),
});

const editor = useAnnotationEditor({
  mode: computed(() => props.annotationMode),
  annotations: computed(() => props.annotations),
  pages: renderer.pages,
  scrollContainer,
  colors: computed(() => props.annotationColors),
  emitCreate: (payload) => emit('annotation:create', payload),
  emitUpdate: (payload) => emit('annotation:update', payload),
  emitDelete: (id) => emit('annotation:delete', id),
});

/**
 * Group annotations by page index so each AnnotationLayer only iterates its
 * own slice. Recomputes whenever the consumer mutates the list.
 */
const annotationsByPage = computed(() => {
  const map = new Map<number, CoarPdfAnnotation[]>();
  for (const a of props.annotations) {
    const list = map.get(a.pageIndex);
    if (list) list.push(a);
    else map.set(a.pageIndex, [a]);
  }
  return map;
});

function annotationsForPage(idx: number): CoarPdfAnnotation[] {
  const base = annotationsByPage.value.get(idx) ?? [];
  // Inject the in-progress ink/marker stroke as a virtual annotation so the
  // existing AnnotationLayer renders it without special-casing. The sentinel
  // id can't collide with consumer-assigned ids.
  const draft = editor.draftInk.value;
  if (draft && draft.pageIndex === idx) {
    const virtual: CoarPdfAnnotation = {
      id: '__coar-pdf-draft-stroke__',
      type: draft.kind,
      pageIndex: idx,
      color: draft.color,
      createdAt: '',
      width: draft.width,
      strokes: draft.strokes,
    };
    return [...base, virtual];
  }
  return base;
}

/** Anchor rect for the popover, derived from the selected annotation's DOM. */
function findAnnotationAnchor(id: string): DOMRect | null {
  const el = scrollContainer.value?.querySelector(`[data-annotation-id="${CSS.escape(id)}"]`);
  return el ? el.getBoundingClientRect() : null;
}

const selectedAnchor = ref<DOMRect | null>(null);

/**
 * Recompute the popover anchor whenever the selection or layout changes. The
 * popover itself also listens for scroll/resize, but we want the initial anchor
 * to be correct before it mounts.
 */
function refreshSelectedAnchor() {
  const id = editor.selectedAnnotationId.value;
  selectedAnchor.value = id ? findAnnotationAnchor(id) : null;
}
watch(() => editor.selectedAnnotationId.value, refreshSelectedAnchor, { flush: 'post' });
watch([scale, rotation, () => props.annotations], () => {
  if (editor.selectedAnnotationId.value) {
    // Wait for the next layout flush so the annotation node is at its new
    // dimensions before we measure.
    requestAnimationFrame(() => requestAnimationFrame(refreshSelectedAnchor));
  }
});

function onAnnotationClick(id: string) {
  // Eraser/select modes handle the pointer interaction themselves in the
  // editor composable; ignore the bubble-up click so we don't (a) re-open
  // the popover for a just-erased id, and (b) clobber the drag-start
  // selection on `select` mode.
  if (props.annotationMode === 'eraser' || props.annotationMode === 'select') return;
  editor.selectAnnotation(id);
}

function onAnnotationModeChange(mode: typeof props.annotationMode) {
  emit('update:annotationMode', mode);
  editor.selectAnnotation(null);
  // First time entering a drawing mode, seed the per-mode color from the
  // current palette so the config bar has a meaningful initial swatch.
  if (mode === 'marker' && !editor.markerColor.value) {
    editor.markerColor.value = props.annotationColors[0] ?? '#fde68a';
  } else if (mode === 'ink' && !editor.inkColor.value) {
    editor.inkColor.value = props.annotationColors[0] ?? '#dc2626';
  }
}

/**
 * For freetext annotations the textarea edits the visible `text`; for the
 * other types it edits the optional side `comment`. Returns the field name
 * to read/write for the selected annotation.
 */
function popoverField(): 'text' | 'comment' {
  const sel = editor.selectedAnnotation.value;
  return sel?.type === 'freetext' ? 'text' : 'comment';
}

const selectedInitialText = computed(() => {
  const sel = editor.selectedAnnotation.value;
  if (!sel) return '';
  return (sel.type === 'freetext' ? sel.text : sel.comment) ?? '';
});

function onPopoverSave(payload: AnnotationPopoverPayload) {
  const sel = editor.selectedAnnotation.value;
  if (!sel) return;
  const field = popoverField();
  const before = field === 'text' && sel.type === 'freetext' ? sel.text : sel.comment;
  const patch: Record<string, unknown> = {};
  if (payload.comment !== before) patch[field] = payload.comment;
  if (payload.color !== sel.color) patch.color = payload.color;
  if (Object.keys(patch).length === 0) return;
  emit('annotation:update', { id: sel.id, patch });
}

function onPopoverDelete() {
  const id = editor.selectedAnnotationId.value;
  if (!id) return;
  emit('annotation:delete', id);
  editor.selectAnnotation(null);
}

function onPopoverClose() {
  editor.selectAnnotation(null);
}

function onDraftSave(payload: AnnotationPopoverPayload) {
  editor.commitDraftPin(payload.comment, payload.color);
}

/**
 * Freetext draft commit. The popover's textarea writes to its generic
 * `comment` field, which we map to the freetext annotation's `text`.
 */
function onDraftFreetextSave(payload: AnnotationPopoverPayload) {
  editor.commitDraftFreetext(payload.comment, payload.color);
}

/* ---- Search -------------------------------------------------------- */

const searchOpen = ref(false);
const search = usePdfSearch({ doc: pdfDoc });

/* ---- Sidebar (thumbnails + outline) -------------------------------- */
/* Sidebar and annotations panel open state are defineModel'd above so
 * consumers can persist them across file swaps. */

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function toggleAnnotationsPanel() {
  annotationsPanelOpen.value = !annotationsPanelOpen.value;
}

/* ---- Resizable side rails ----------------------------------------- */

const SIDEBAR_DEFAULT = 220;
const SIDEBAR_MIN = 160;
const PANEL_DEFAULT = 280;
const PANEL_MIN = 220;
/** Minimum width the document column may shrink to during a drag. */
const CENTER_MIN = 320;

const sidebarWidth = ref(SIDEBAR_DEFAULT);
const annotationsPanelWidth = ref(PANEL_DEFAULT);

/** Which divider is currently being dragged. Drives the page-wide cursor + select suppress. */
const resizing = ref<null | 'sidebar' | 'panel'>(null);

const viewerRoot = ref<HTMLElement | null>(null);

function startResize(target: 'sidebar' | 'panel', event: PointerEvent) {
  event.preventDefault();
  resizing.value = target;
  const startX = event.clientX;
  const startSidebar = sidebarWidth.value;
  const startPanel = annotationsPanelWidth.value;

  function onMove(ev: PointerEvent) {
    const rootW = viewerRoot.value?.getBoundingClientRect().width ?? 0;
    if (!rootW) return;
    const other = target === 'sidebar'
      ? (annotationsPanelOpen.value ? annotationsPanelWidth.value : 0)
      : (sidebarOpen.value ? sidebarWidth.value : 0);
    const dividers = (sidebarOpen.value ? 1 : 0) + (annotationsPanelOpen.value ? 1 : 0);
    const available = rootW - other - CENTER_MIN - dividers;
    const delta = ev.clientX - startX;
    if (target === 'sidebar') {
      sidebarWidth.value = Math.min(Math.max(startSidebar + delta, SIDEBAR_MIN), Math.max(SIDEBAR_MIN, available));
    } else {
      annotationsPanelWidth.value = Math.min(Math.max(startPanel - delta, PANEL_MIN), Math.max(PANEL_MIN, available));
    }
  }
  function onUp() {
    resizing.value = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

/**
 * Click handler from the annotations panel — selects the annotation, scrolls
 * the page into view, and opens the edit popover. The full edit flow gives
 * the user the same affordance whether they clicked the annotation in the
 * document or the entry in the side list.
 */
function onAnnotationPanelSelect(id: string) {
  const annotation = props.annotations.find((a) => a.id === id);
  if (!annotation) return;
  editor.selectAnnotation(id);
  renderer.scrollToPage(annotation.pageIndex, { behavior: 'smooth' });
}

function onAnnotationPanelDelete(id: string) {
  emit('annotation:delete', id);
  if (editor.selectedAnnotationId.value === id) {
    editor.selectAnnotation(null);
  }
}

function onSidebarJump(idx: number) {
  renderer.scrollToPage(idx, { behavior: 'smooth' });
}

/** Group matches by page index — each page only iterates its own slice. */
const searchMatchesByPage = computed(() => {
  const map = new Map<number, SearchMatch[]>();
  for (const m of search.matches.value) {
    const list = map.get(m.pageIndex);
    if (list) list.push(m);
    else map.set(m.pageIndex, [m]);
  }
  return map;
});

function searchMatchesForPage(idx: number): SearchMatch[] {
  return searchMatchesByPage.value.get(idx) ?? [];
}

/**
 * Pixel size of a page in its UNROTATED orientation (intrinsic × scale). Used
 * to size the annotation + search overlays; their internal coordinate space
 * stays unrotated, and a CSS transform aligns them with the rotated wrapper.
 */
function unrotatedDims(intrinsicWidth: number, intrinsicHeight: number) {
  return { w: intrinsicWidth * scale.value, h: intrinsicHeight * scale.value };
}

/** Rotation transform that maps unrotated overlay coords onto the rotated wrapper. */
const overlayTransform = computed(() => {
  return (w: number, h: number): string => {
    switch (rotation.value) {
      case 90:
        return `translate(${h}px, 0) rotate(90deg)`;
      case 180:
        return `translate(${w}px, ${h}px) rotate(180deg)`;
      case 270:
        return `translate(0, ${w}px) rotate(270deg)`;
      default:
        return 'none';
    }
  };
});

/** True for the single rect that belongs to the active match. */
function isCurrentMatch(match: SearchMatch): boolean {
  return search.currentMatch.value === match;
}

function openSearch() {
  searchOpen.value = true;
}

function closeSearch() {
  searchOpen.value = false;
  search.clear();
}

function onSearchQueryChange(q: string) {
  void search.setQuery(q);
}

// Scroll to the current match whenever it changes.
watch(
  () => search.currentMatch.value,
  (m) => {
    if (!m) return;
    renderer.scrollToPage(m.pageIndex, { behavior: 'smooth' });
    // After the page is in view, also nudge the scroll so the match rect is
    // visible. We pick the first rect of the match as the anchor.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = scrollContainer.value;
        const page = renderer.pages[m.pageIndex];
        if (!container || !page?.wrapper) return;
        const r = m.rects[0];
        if (!r) return;
        const targetTop = page.wrapper.offsetTop - container.offsetTop + r.y * page.displayHeight;
        // Center the match vertically in the viewport.
        const desired = Math.max(0, targetTop - container.clientHeight / 2);
        container.scrollTop = desired;
      });
    });
  },
);

function bindWrapperRef(index: number) {
  return (el: unknown) => renderer.bindWrapper(index, el);
}

function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

function snapZoom(z: number): number {
  return Math.round(z * 100) / 100;
}

/**
 * Apply a zoom/rotation change while preserving the user's current reading
 * spot — captured as (visible page + per-page offset) and re-applied after the
 * wrappers have laid out. Without this, the absolute `scrollTop` survives but
 * lands on a different page once page heights change.
 *
 * Ctrl+wheel zoom uses its own cursor-anchored math; only toolbar-driven zoom
 * (buttons, presets, reset) goes through this path.
 */
function withPositionPreserved(apply: () => void) {
  const container = scrollContainer.value;
  const idx = renderer.visiblePage.value;
  const page = renderer.pages[idx];
  let pageOffset = 0;
  if (container && page?.wrapper) {
    const wrapperTop = page.wrapper.offsetTop - container.offsetTop;
    pageOffset = Math.max(
      0,
      Math.min(1, (container.scrollTop - wrapperTop) / Math.max(1, page.displayHeight)),
    );
  }
  apply();
  // Use `nextTick` rather than `requestAnimationFrame` so the scroll
  // adjustment lands as a microtask AFTER Vue has flushed the page-wrapper
  // resize, but BEFORE the next browser paint. Two rAFs let the browser
  // paint once between DOM update and scrollTop — the user saw a single
  // frame of "wrong page" content (the old scrollTop in the new layout)
  // as a flicker. nextTick removes that intermediate paint.
  void nextTick(() => {
    const c = scrollContainer.value;
    const p = renderer.pages[idx];
    if (!c || !p?.wrapper) return;
    // Suppress `scroll-behavior: smooth` so the assignment lands instantly
    // rather than animating from the browser's auto-anchored position.
    const prev = c.style.scrollBehavior;
    c.style.scrollBehavior = 'auto';
    const wrapperTop = p.wrapper.offsetTop - c.offsetTop;
    c.scrollTop = wrapperTop + pageOffset * p.displayHeight;
    c.style.scrollBehavior = prev;
  });
}

/** Jump to the next standard zoom level above the current scale. */
function zoomIn() {
  const cur = scale.value;
  const next = ZOOM_LEVELS.find((z) => z > cur + 1e-6);
  if (next === undefined) return;
  withPositionPreserved(() => {
    scale.value = next;
  });
}

/** Jump to the next standard zoom level below the current scale. */
function zoomOut() {
  const cur = scale.value;
  let prev: number | undefined;
  for (const z of ZOOM_LEVELS) {
    if (z < cur - 1e-6) prev = z;
    else break;
  }
  if (prev === undefined) return;
  withPositionPreserved(() => {
    scale.value = prev as number;
  });
}

function setZoom(z: number) {
  withPositionPreserved(() => {
    scale.value = clampZoom(snapZoom(z));
  });
}

function fitToWidth() {
  const container = scrollContainer.value;
  // Compute against the currently visible page, not page 0, so a fit on a
  // landscape page mid-document doesn't snap to the cover page's dimensions.
  const page = renderer.pages[renderer.visiblePage.value] ?? renderer.pages[0];
  if (!container || !page) return;
  const usable = container.clientWidth - FIT_PADDING;
  if (usable <= 0) return;
  const rotated = rotation.value === 90 || rotation.value === 270;
  const w = rotated ? page.intrinsicHeight : page.intrinsicWidth;
  setZoom(usable / w);
}

function fitToPage() {
  const container = scrollContainer.value;
  const page = renderer.pages[renderer.visiblePage.value] ?? renderer.pages[0];
  if (!container || !page) return;
  const usableW = container.clientWidth - FIT_PADDING;
  const usableH = container.clientHeight - FIT_PADDING;
  if (usableW <= 0 || usableH <= 0) return;
  const rotated = rotation.value === 90 || rotation.value === 270;
  const w = rotated ? page.intrinsicHeight : page.intrinsicWidth;
  const h = rotated ? page.intrinsicWidth : page.intrinsicHeight;
  setZoom(Math.min(usableW / w, usableH / h));
}

/** Reset zoom + rotation to defaults; preserves the current page + offset. */
function resetView() {
  withPositionPreserved(() => {
    scale.value = 1;
    rotation.value = 0;
  });
}

const ROTATIONS: readonly PageRotation[] = [0, 90, 180, 270];

function rotateBy(deltaQuarters: number) {
  withPositionPreserved(() => {
    const i = ROTATIONS.indexOf(rotation.value);
    const next = ROTATIONS[(i + deltaQuarters + 4) % 4];
    rotation.value = next;
  });
}

function rotateCw() {
  rotateBy(1);
}

function rotateCcw() {
  rotateBy(-1);
}

/**
 * Per-page intrinsic dims of the currently visible page, for the Info panel.
 * Null when no page is bound yet (status !== 'ready').
 */
const currentPageInfo = computed(() => {
  const idx = renderer.visiblePage.value;
  const page = renderer.pages[idx];
  if (!page) return null;
  return { index: idx, width: page.intrinsicWidth, height: page.intrinsicHeight };
});

/**
 * URL exposed by the active source for print + download.
 *
 * PDF + image sources both have a single `url`. Image galleries expose
 * `urls[]`; for those we return the currently visible page's URL so the
 * user can print / download the page they're looking at. Bulk-print of
 * an entire gallery would need either a generated HTML doc with all
 * images stacked or a zip download — both deferred to a later iteration.
 */
const sourceUrl = computed(() => {
  const s = props.source;
  if (s.kind === 'pdf' || s.kind === 'image') return s.url;
  if (s.kind === 'image-gallery') {
    return s.urls[renderer.visiblePage.value] ?? s.urls[0] ?? '';
  }
  return '';
});

/**
 * Trigger the browser's native print dialog for the source. We render the
 * URL in a hidden iframe (the browser's built-in PDF / image viewer handles
 * it) and call `print()` on its window once loaded. Works for same-origin
 * URLs and blob: URLs; cross-origin requires the server to allow framing.
 */
function printDoc() {
  const url = sourceUrl.value;
  if (!url) return;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  iframe.src = url;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Cross-origin frame access denied — fall back to opening the URL in
      // a new tab so the user can print from the browser's own viewer.
      window.open(url, '_blank', 'noopener');
    } finally {
      // Clean up after the print dialog has had a chance to open.
      setTimeout(() => iframe.remove(), 60_000);
    }
  };
  document.body.appendChild(iframe);
}

/**
 * Trigger a download of the source URL. For blob: URLs the browser saves
 * the underlying file; for http(s) URLs the `download` attribute requests
 * attachment-style download (subject to same-origin policy and server CORS).
 */
function downloadDoc() {
  const url = sourceUrl.value;
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  // Derive a sensible filename: the URL's last segment, or a generic fallback.
  // For PDFs we want a .pdf extension; for images we accept whatever's there.
  try {
    const u = new URL(url, window.location.href);
    const name = u.pathname.split('/').pop();
    a.download = name || (props.source.kind === 'pdf' ? 'document.pdf' : 'document');
  } catch {
    a.download = props.source.kind === 'pdf' ? 'document.pdf' : 'document';
  }
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function togglePan() {
  pointerMode.value = pointerMode.value === 'pan' ? 'select' : 'pan';
}

/* ---- Pinch-to-zoom on touchscreens -------------------------------- */

/**
 * Pinch gesture state. Captured at touchstart with two fingers; cleared
 * when fewer than two fingers remain. The scroll container also has
 * `touch-action: pan-x pan-y` so the browser stops doing its own
 * viewport-level pinch-zoom and we get a chance to call `preventDefault`
 * on the moves.
 */
let pinchStartDistance: number | null = null;
let pinchStartScale: number | null = null;

function touchDistance(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 2) return;
  pinchStartDistance = touchDistance(e.touches[0], e.touches[1]);
  pinchStartScale = scale.value;
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length !== 2 || pinchStartDistance === null || pinchStartScale === null) return;
  e.preventDefault();
  const container = scrollContainer.value;
  if (!container) return;

  const newDistance = touchDistance(e.touches[0], e.touches[1]);
  const targetScale = clampZoom(pinchStartScale * (newDistance / pinchStartDistance));
  const oldScale = scale.value;
  if (targetScale === oldScale) return;

  // Page-anchor Y, midpoint-anchor X — same hybrid strategy as `onWheel`.
  const idx = renderer.visiblePage.value;
  const page = renderer.pages[idx];
  let pageOffset = 0;
  if (page?.wrapper) {
    const wrapperTop = page.wrapper.offsetTop - container.offsetTop;
    pageOffset = Math.max(
      0,
      Math.min(1, (container.scrollTop - wrapperTop) / Math.max(1, page.displayHeight)),
    );
  }
  const rect = container.getBoundingClientRect();
  const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
  const docX = container.scrollLeft + midX;

  const ratio = targetScale / oldScale;
  scale.value = snapZoom(targetScale);

  void nextTick(() => {
    const c = scrollContainer.value;
    if (!c) return;
    const prev = c.style.scrollBehavior;
    c.style.scrollBehavior = 'auto';
    c.scrollLeft = docX * ratio - midX;
    const p = renderer.pages[idx];
    if (p?.wrapper) {
      const wrapperTop = p.wrapper.offsetTop - c.offsetTop;
      c.scrollTop = wrapperTop + pageOffset * p.displayHeight;
    }
    c.style.scrollBehavior = prev;
  });
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) {
    pinchStartDistance = null;
    pinchStartScale = null;
  }
}

/**
 * Attach the pinch handlers imperatively rather than via `@touchmove="…"`
 * — Chrome/Firefox treat declarative listeners on scrollable elements as
 * passive by default, which silently no-ops the `preventDefault` we need
 * to suppress the browser's viewport-level pinch-zoom.
 */
watch(
  () => scrollContainer.value,
  (el, prev) => {
    if (prev) {
      prev.removeEventListener('touchstart', onTouchStart);
      prev.removeEventListener('touchmove', onTouchMove);
      prev.removeEventListener('touchend', onTouchEnd);
      prev.removeEventListener('touchcancel', onTouchEnd);
    }
    if (el) {
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd, { passive: true });
      el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }
  },
  { immediate: true },
);

let panStartX = 0;
let panStartY = 0;
let panStartScrollLeft = 0;
let panStartScrollTop = 0;

function onPanMouseDown(e: MouseEvent) {
  if (pointerMode.value !== 'pan') return;
  if (e.button !== 0) return;
  const container = scrollContainer.value;
  if (!container) return;
  e.preventDefault();
  panning.value = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panStartScrollLeft = container.scrollLeft;
  panStartScrollTop = container.scrollTop;
  window.addEventListener('mousemove', onPanMouseMove);
  window.addEventListener('mouseup', onPanMouseUp);
}

function onPanMouseMove(e: MouseEvent) {
  const container = scrollContainer.value;
  if (!container) return;
  container.scrollLeft = panStartScrollLeft - (e.clientX - panStartX);
  container.scrollTop = panStartScrollTop - (e.clientY - panStartY);
}

function onPanMouseUp() {
  panning.value = false;
  window.removeEventListener('mousemove', onPanMouseMove);
  window.removeEventListener('mouseup', onPanMouseUp);
}

/**
 * Toolbar prop bag — kept as a computed so the template can place the same
 * `<DocumentToolbar>` in different slots (top/bottom outside the body row, left/
 * right inside) without re-listing every prop four times.
 */
const toolbarBindings = computed(() => ({
  currentPage: renderer.visiblePage.value,
  pageCount: pageCount.value,
  zoom: scale.value,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  pointerMode: pointerMode.value,
  annotationMode: props.annotationMode,
  markerWidthPresets: MARKER_WIDTH_PRESETS,
  inkWidthPresets: INK_WIDTH_PRESETS,
  markerWidth: editor.markerWidth.value,
  markerColor: editor.markerColor.value || props.annotationColors[0] || '#fde68a',
  inkWidth: editor.inkWidth.value,
  inkColor: editor.inkColor.value || props.annotationColors[0] || '#dc2626',
  colors: props.annotationColors,
  side: props.toolbarPosition,
  labels: labels.value,
  showSearch: props.showSearch,
  showPrintDownload: props.showPrintDownload,
  showAnnotationModes: props.showAnnotationModes,
  showSidebarToggle: props.showThumbnails || props.showOutline,
  sidebarOpen: sidebarOpen.value,
  showAnnotationsPanelToggle: props.showAnnotationsPanel,
  annotationsPanelOpen: annotationsPanelOpen.value,
  tools: props.tools,
  capabilities: props.source.capabilities,
}));

const toolbarHandlers = {
  prev: onPrevPage,
  next: onNextPage,
  jump: onJumpPage,
  'zoom-in': zoomIn,
  'zoom-out': zoomOut,
  'reset-zoom': () => setZoom(1),
  'set-zoom': (z: number) => setZoom(z),
  'reset-view': resetView,
  'toggle-pan': togglePan,
  'toggle-sidebar': toggleSidebar,
  'toggle-annotations-panel': toggleAnnotationsPanel,
  'rotate-cw': rotateCw,
  'rotate-ccw': rotateCcw,
  'set-annotation-mode': onAnnotationModeChange,
  'update:marker-width': (w: number) => (editor.markerWidth.value = w),
  'update:marker-color': (c: string) => (editor.markerColor.value = c),
  'update:ink-width': (w: number) => (editor.inkWidth.value = w),
  'update:ink-color': (c: string) => (editor.inkColor.value = c),
  'fit-width': fitToWidth,
  'fit-page': fitToPage,
  search: openSearch,
  print: printDoc,
  download: downloadDoc,
};

function onPrevPage() {
  if (renderer.visiblePage.value > 0) {
    renderer.scrollToPage(renderer.visiblePage.value - 1, { behavior: 'smooth' });
  }
}

function onNextPage() {
  if (renderer.visiblePage.value < renderer.pages.length - 1) {
    renderer.scrollToPage(renderer.visiblePage.value + 1, { behavior: 'smooth' });
  }
}

function onJumpPage(idx: number) {
  renderer.scrollToPage(idx, { behavior: 'smooth' });
}

/**
 * Ctrl/Cmd + wheel zooms instead of scrolling.
 *
 * Hybrid anchor strategy:
 *  - Y-axis: pin the currently-visible page (`renderer.visiblePage`) at the
 *    same fractional offset within it. This guarantees the user stays on the
 *    page they were reading — pure cursor-Y anchoring accumulates rounding
 *    error across multiple wheel ticks and can drift several pages over a
 *    long zoom, which surprises users.
 *  - X-axis: cursor-anchored, so the horizontal point under the cursor stays
 *    put. Useful for zooming into a specific column / figure on wide pages.
 */
function onWheel(e: WheelEvent) {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  const container = scrollContainer.value;
  if (!container) return;

  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  const oldScale = scale.value;
  const newScale = clampZoom(oldScale * factor);
  if (newScale === oldScale) return;

  // Snapshot the page anchor BEFORE the scale change so we can re-derive the
  // target scrollTop after page wrappers resize.
  const idx = renderer.visiblePage.value;
  const page = renderer.pages[idx];
  let pageOffset = 0;
  if (page?.wrapper) {
    const wrapperTop = page.wrapper.offsetTop - container.offsetTop;
    pageOffset = Math.max(
      0,
      Math.min(1, (container.scrollTop - wrapperTop) / Math.max(1, page.displayHeight)),
    );
  }

  // X cursor anchor — same math as before, just on the X axis only.
  const rect = container.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const docX = container.scrollLeft + cursorX;

  scale.value = snapZoom(newScale);
  const ratio = newScale / oldScale;

  // `nextTick` runs as a microtask after Vue flushes the wrapper resize
  // (synchronous mutation inside `usePageRenderer`'s scale watcher) but
  // before the next paint — so the scrollTop adjustment lands in the same
  // frame as the new wrapper sizes, eliminating the one-frame "wrong
  // content visible" flicker that rAF would introduce.
  void nextTick(() => {
    const c = scrollContainer.value;
    if (!c) return;
    // Suppress the CSS `scroll-behavior: smooth` for the duration of this
    // adjustment — otherwise the browser animates from its auto-anchored
    // position back to our target. The CSS rule is there for jump-to-page
    // and search-match navigation, both of which set their own explicit
    // `behavior` on `scrollTo({...})`, so suppressing it here has no side
    // effect on those flows.
    const prev = c.style.scrollBehavior;
    c.style.scrollBehavior = 'auto';
    c.scrollLeft = docX * ratio - cursorX;
    const p = renderer.pages[idx];
    if (p?.wrapper) {
      const wrapperTop = p.wrapper.offsetTop - c.offsetTop;
      c.scrollTop = wrapperTop + pageOffset * p.displayHeight;
    }
    c.style.scrollBehavior = prev;
  });
}

// Source loading is owned by `useDocumentLoader` — it watches `sourceRef`
// (immediate) and dispatches on `source.kind`. The viewer just consumes
// `status`, `error`, `pdfDoc`, and `pageProviders`.

watch(
  () => error.value,
  (err) => {
    if (err !== null && err !== undefined) {
      emit('error', { error: err, src: sourceUrl.value });
    }
  },
);

defineExpose({
  /** Manually reload the current document. */
  reload: retry,
  /** Tear down the loaded document. */
  destroy,
  /** Scroll to a 0-based page index. */
  scrollToPage: renderer.scrollToPage,
});
</script>

<template>
  <!-- Outer is a flex ROW: side panels (sidebar / annotations) flank a
       middle column. The middle column is itself a flex COLUMN containing
       the toolbar (top/bottom) and a body row with optional side toolbars +
       the scroll container. This matches the page-builder pattern: each
       panel is full-height, and the toolbar only spans the document column.
       1px dividers between panels are drag-resizable. -->
  <div
    ref="viewerRoot"
    class="coar-pdf-viewer"
    :class="{ 'coar-pdf-viewer--resizing': resizing !== null }"
    :data-status="status"
  >
    <DocumentSidebar
      v-if="sidebarOpen && status === 'ready' && (showThumbnails || showOutline)"
      :doc="pdfDoc"
      :page-providers="pageProviders"
      :page-count="pageCount"
      :visible-page="renderer.visiblePage.value"
      :show-thumbnails="showThumbnails"
      :show-outline="showOutline"
      :labels="labels"
      :style="{ width: sidebarWidth + 'px', flexBasis: sidebarWidth + 'px' }"
      @jump="onSidebarJump"
      @close="sidebarOpen = false"
    />
    <div
      v-if="sidebarOpen && status === 'ready' && (showThumbnails || showOutline)"
      class="coar-pdf-viewer__divider"
      role="separator"
      aria-orientation="vertical"
      @pointerdown="startResize('sidebar', $event)"
    />

    <div class="coar-pdf-viewer__center">
      <DocumentToolbar
        v-if="showToolbar && (status === 'ready' || status === 'loading') && toolbarPosition === 'top'"
        v-bind="toolbarBindings"
        v-on="toolbarHandlers"
      />

      <DocumentSearchBar
        v-if="searchOpen && status === 'ready'"
        :query="search.query.value"
        :match-count="search.matches.value.length"
        :current-index="search.currentIndex.value"
        :searching="search.searching.value"
        :labels="labels"
        @update:query="onSearchQueryChange"
        @next="search.next"
        @prev="search.prev"
        @close="closeSearch"
      />

      <div class="coar-pdf-viewer__body">
        <DocumentToolbar
          v-if="showToolbar && (status === 'ready' || status === 'loading') && toolbarPosition === 'left'"
          v-bind="toolbarBindings"
          v-on="toolbarHandlers"
        />

      <div
        ref="scrollContainer"
      class="coar-pdf-viewer__scroll"
      :class="{
        'coar-pdf-viewer__scroll--pan': pointerMode === 'pan',
        'coar-pdf-viewer__scroll--panning': panning,
        'coar-pdf-viewer__scroll--annotate-comment': annotationMode === 'comment',
        'coar-pdf-viewer__scroll--annotate-ink': annotationMode === 'ink',
        'coar-pdf-viewer__scroll--annotate-marker': annotationMode === 'marker',
        'coar-pdf-viewer__scroll--annotate-freetext': annotationMode === 'freetext',
        'coar-pdf-viewer__scroll--annotate-select': annotationMode === 'select',
        'coar-pdf-viewer__scroll--annotate-eraser': annotationMode === 'eraser',
      }"
      role="document"
      @wheel="onWheel"
      @mousedown="onPanMouseDown"
    >
      <div v-if="status === 'ready' || status === 'loading'" class="coar-pdf-viewer__pages">
        <div
          v-for="page in renderer.pages"
          :key="page.index"
          :ref="bindWrapperRef(page.index)"
          class="coar-pdf-page"
          :style="{
            width: page.displayWidth + 'px',
            height: page.displayHeight + 'px',
          }"
          :data-page-index="page.index"
          :aria-label="`Page ${page.index + 1} of ${pageCount}`"
        >
          <!-- canvas + textLayer are injected imperatively by usePageRenderer
               when the page intersects the viewport. The annotation overlay
               is declarative — driven by the consumer-owned annotations list. -->
          <AnnotationLayer
            :annotations="annotationsForPage(page.index)"
            :display-width="unrotatedDims(page.intrinsicWidth, page.intrinsicHeight).w"
            :display-height="unrotatedDims(page.intrinsicWidth, page.intrinsicHeight).h"
            :rotation="rotation"
            @annotation-click="onAnnotationClick"
          />

          <!-- Search-result overlay. Transient (not persisted), pointer-events
               disabled so it never interferes with selection or annotations.
               Lives in the same unrotated coordinate space as AnnotationLayer
               and uses the matching CSS transform to align with the rotated
               wrapper. -->
          <div
            v-if="searchMatchesForPage(page.index).length > 0"
            class="coar-pdf-search-overlay"
            :style="{
              width: unrotatedDims(page.intrinsicWidth, page.intrinsicHeight).w + 'px',
              height: unrotatedDims(page.intrinsicWidth, page.intrinsicHeight).h + 'px',
              transform: overlayTransform(
                unrotatedDims(page.intrinsicWidth, page.intrinsicHeight).w,
                unrotatedDims(page.intrinsicWidth, page.intrinsicHeight).h,
              ),
            }"
          >
            <template v-for="(match, mi) in searchMatchesForPage(page.index)" :key="mi">
              <div
                v-for="(rect, ri) in match.rects"
                :key="`${mi}-${ri}`"
                class="coar-pdf-search-rect"
                :class="{ 'coar-pdf-search-rect--current': isCurrentMatch(match) }"
                :style="{
                  left: rect.x * unrotatedDims(page.intrinsicWidth, page.intrinsicHeight).w + 'px',
                  top: rect.y * unrotatedDims(page.intrinsicWidth, page.intrinsicHeight).h + 'px',
                  width: rect.w * unrotatedDims(page.intrinsicWidth, page.intrinsicHeight).w + 'px',
                  height: rect.h * unrotatedDims(page.intrinsicWidth, page.intrinsicHeight).h + 'px',
                }"
              />
            </template>
          </div>
        </div>
      </div>

      <div
        v-if="status === 'loading'"
        class="coar-pdf-viewer__overlay coar-pdf-viewer__overlay--loading"
        role="status"
        aria-live="polite"
      >
        <slot name="loading">{{ labels.loading }}</slot>
      </div>

      <!-- Edit popover for the currently-selected existing annotation. For
           freetext, the textarea edits the visible `text`; for the other
           types, it edits the optional side `comment`. -->
      <AnnotationPopover
        v-if="editor.selectedAnnotation.value && selectedAnchor"
        :anchor="selectedAnchor"
        :initial-comment="selectedInitialText"
        :initial-color="editor.selectedAnnotation.value.color"
        :colors="annotationColors"
        :draft="false"
        :labels="labels"
        @save="onPopoverSave"
        @delete="onPopoverDelete"
        @close="onPopoverClose"
      />

      <!-- Draft popover for a new comment pin awaiting user confirmation. -->
      <AnnotationPopover
        v-if="editor.draftPin.value"
        :anchor="editor.draftPin.value.viewportRect"
        :initial-comment="''"
        :initial-color="editor.draftPin.value.color"
        :colors="annotationColors"
        :draft="true"
        :labels="labels"
        @save="onDraftSave"
        @close="editor.cancelDraftPin"
      />

      <!-- Draft popover for a new freetext box — same UI as the pin draft,
           but the textarea writes to the annotation's `text` field. -->
      <AnnotationPopover
        v-if="editor.draftFreetext.value"
        :anchor="editor.draftFreetext.value.viewportRect"
        :initial-comment="''"
        :initial-color="editor.draftFreetext.value.color"
        :colors="annotationColors"
        :draft="true"
        :labels="labels"
        @save="onDraftFreetextSave"
        @close="editor.cancelDraftFreetext"
      />

      <div
        v-if="status === 'error'"
        class="coar-pdf-viewer__overlay coar-pdf-viewer__overlay--error"
        role="alert"
      >
        <slot name="error" :error="error" :retry="retry">
          <div class="coar-pdf-viewer__error-body">
            <p class="coar-pdf-viewer__error-title">{{ labels.errorTitle }}</p>
            <button type="button" class="coar-pdf-viewer__error-retry" @click="retry">
              {{ labels.errorRetry }}
            </button>
          </div>
        </slot>
      </div>
      </div>
      <!-- /scrollContainer — popovers above are teleported, so their order
           in the template doesn't drive the visible layout. -->

        <DocumentToolbar
          v-if="showToolbar && (status === 'ready' || status === 'loading') && toolbarPosition === 'right'"
          v-bind="toolbarBindings"
          v-on="toolbarHandlers"
        />
      </div>
      <!-- /body row -->

      <DocumentToolbar
        v-if="showToolbar && (status === 'ready' || status === 'loading') && toolbarPosition === 'bottom'"
        v-bind="toolbarBindings"
        v-on="toolbarHandlers"
      />
    </div>
    <!-- /center column -->

    <div
      v-if="annotationsPanelOpen && status === 'ready' && showAnnotationsPanel"
      class="coar-pdf-viewer__divider"
      role="separator"
      aria-orientation="vertical"
      @pointerdown="startResize('panel', $event)"
    />
    <DocumentAnnotationPanel
      v-if="annotationsPanelOpen && status === 'ready' && showAnnotationsPanel"
      :annotations="annotations"
      :selected-id="editor.selectedAnnotationId.value"
      :info="showInfoSection ? info : null"
      :current-page-info="showInfoSection ? currentPageInfo : null"
      :labels="labels"
      :style="{ width: annotationsPanelWidth + 'px', flexBasis: annotationsPanelWidth + 'px' }"
      @select="onAnnotationPanelSelect"
      @delete="onAnnotationPanelDelete"
      @close="annotationsPanelOpen = false"
    />
  </div>
</template>

<style scoped>
.coar-pdf-viewer {
  --coar-pdf-toolbar-bg: var(--coar-color-surface-2, #f6f7f8);
  --coar-pdf-toolbar-fg: var(--coar-color-fg, #1a1a1a);
  --coar-pdf-page-bg: var(--coar-color-surface, #ffffff);
  --coar-pdf-page-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
  --coar-pdf-page-gap: 16px;
  --coar-pdf-canvas-bg: #ffffff;
  --coar-pdf-comment-pin-bg: var(--coar-color-accent, #2563eb);
  --coar-pdf-comment-pin-fg: #ffffff;
  --coar-pdf-selection-bg: rgba(37, 99, 235, 0.25);
  --coar-pdf-overlay-bg: rgba(0, 0, 0, 0.04);

  position: relative;
  /* Row layout — side panels (sidebar, annotations) flank the document column.
     The document column itself is a flex column (toolbar above + body row
     containing optional vertical toolbars + the scroll viewport). */
  display: flex;
  flex-direction: row;
  height: 100%;
  min-height: 0;
  min-width: 0;
  background: var(--coar-pdf-overlay-bg);
  color: var(--coar-pdf-toolbar-fg);
  overflow: hidden;
}

.coar-pdf-viewer__center {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.coar-pdf-viewer__body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  /* Inside the center column — vertical toolbars flank the scroll viewport.
     Keep this a plain flex row — no z-index — so overlays compose naturally. */
}

/* 1px draggable splitter between side panels and the center column. Mirrors
   page-builder's pattern: the divider takes 1px of layout space and a wider
   pointer hit-area is provided via a pseudo-element. */
.coar-pdf-viewer__divider {
  flex: 0 0 1px;
  width: 1px;
  background: var(--coar-color-border, #e5e7eb);
  cursor: col-resize;
  position: relative;
  /* Inflate the hit-area to ±3px without affecting layout. */
}
.coar-pdf-viewer__divider::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -3px;
  right: -3px;
  z-index: 1;
}
.coar-pdf-viewer__divider:hover,
.coar-pdf-viewer--resizing .coar-pdf-viewer__divider {
  background: var(--coar-color-accent, #2563eb);
}

/* While a splitter is being dragged, suppress global selection and pin the
   cursor so it stays as col-resize even when the pointer leaves the divider. */
.coar-pdf-viewer--resizing {
  user-select: none;
  cursor: col-resize;
}
.coar-pdf-viewer--resizing * {
  cursor: col-resize !important;
}

/* ── Header height alignment ─────────────────────────────────────────────
   Sidebar, top toolbar, and annotation panel headers all sit on the same
   horizontal line; matching their heights makes the three columns read as a
   single top edge. 44px matches the page-builder convention.

   `!important` is required because the child components live in their own
   scoped-CSS contexts where the [data-v-xxx] attribute selector outranks our
   `:deep()` rules. The override is purely layout-level and won't surprise
   anyone reading the child component in isolation. */
.coar-pdf-viewer__center > :deep(.coar-pdf-toolbar) {
  min-height: 44px !important;
  height: 44px !important;
  box-sizing: border-box;
  border-bottom: 1px solid var(--coar-color-border, #e5e7eb);
}
.coar-pdf-viewer :deep(.coar-pdf-sidebar__header) {
  min-height: 44px !important;
  height: 44px !important;
  box-sizing: border-box;
}
.coar-pdf-viewer :deep(.coar-pdf-anno-panel__header) {
  min-height: 44px !important;
  height: 44px !important;
  box-sizing: border-box;
}

.coar-pdf-viewer__scroll {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  /* The scroll viewport is the IntersectionObserver root — keep it the actual
     overflow container so visibility detection is accurate. */
  overscroll-behavior: contain;
  /* Smooth scroll for in-document navigation (jump-to-page, search). */
  scroll-behavior: smooth;
  /* Allow single-finger panning to scroll the document; disable the browser's
     pinch-zoom so two-finger gestures bubble to our pinch handler instead of
     zooming the whole HTML viewport. */
  touch-action: pan-x pan-y;
}

/* Pan mode — drag-to-scroll. Disable text-layer hit testing so spans don't
   eat the mousedown, and switch the cursor to grab. While the drag is active
   we suppress smooth-scroll so the document tracks the cursor 1:1 without
   easing lag. */
.coar-pdf-viewer__scroll--pan {
  cursor: grab;
  scroll-behavior: auto;
}
.coar-pdf-viewer__scroll--pan :deep(.textLayer) {
  pointer-events: none;
  user-select: none;
}
.coar-pdf-viewer__scroll--panning {
  cursor: grabbing;
}

/* Comment mode — crosshair cursor everywhere except on existing pins (which
   keep their own pointer cursor for editing). */
.coar-pdf-viewer__scroll--annotate-comment {
  cursor: crosshair;
}
.coar-pdf-viewer__scroll--annotate-comment :deep(.coar-pdf-annotation-pin) {
  cursor: pointer;
}

/* Ink mode — crosshair, with the textLayer disabled so it doesn't intercept
   the pointerdown that starts a stroke. Browsers don't ship a "pen" cursor by
   default; crosshair is the conventional drawing affordance. */
.coar-pdf-viewer__scroll--annotate-ink,
.coar-pdf-viewer__scroll--annotate-marker {
  cursor: crosshair;
}
.coar-pdf-viewer__scroll--annotate-ink :deep(.textLayer),
.coar-pdf-viewer__scroll--annotate-marker :deep(.textLayer) {
  pointer-events: none;
  user-select: none;
}

/* Freetext mode — text-insertion cursor; we still want clicks to fire on the
   page wrapper so the textLayer goes inert. */
.coar-pdf-viewer__scroll--annotate-freetext {
  cursor: text;
}
.coar-pdf-viewer__scroll--annotate-freetext :deep(.textLayer) {
  pointer-events: none;
  user-select: none;
}

/* Select mode — default cursor on the page, move cursor on existing
   annotations. textLayer goes inert so a pointerdown on a span doesn't
   start a text selection in the middle of a move-drag. */
.coar-pdf-viewer__scroll--annotate-select :deep(.textLayer) {
  pointer-events: none;
  user-select: none;
}
.coar-pdf-viewer__scroll--annotate-select :deep([data-annotation-id]) {
  cursor: move;
}

/* Eraser mode — cell cursor (a small crosshair on Windows/Linux, a square
   reticle on macOS) signals destructive precise-target action. */
.coar-pdf-viewer__scroll--annotate-eraser {
  cursor: cell;
}
.coar-pdf-viewer__scroll--annotate-eraser :deep(.textLayer) {
  pointer-events: none;
  user-select: none;
}
.coar-pdf-viewer__scroll--annotate-eraser :deep([data-annotation-id]) {
  cursor: not-allowed;
}

.coar-pdf-viewer__pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--coar-pdf-page-gap);
  padding: var(--coar-pdf-page-gap);
  /* Without these two, `align-items: center` lets a page wider than the scroll
     viewport overflow into BOTH sides equally (no horizontal scrollbar). Set
     `width: max-content` so the container grows to fit its widest child, and
     `min-width: 100%` so a narrower page still centers across the viewport. */
  width: max-content;
  min-width: 100%;
  box-sizing: border-box;
}

.coar-pdf-page {
  position: relative;
  flex: 0 0 auto;
  background: var(--coar-pdf-canvas-bg);
  box-shadow: var(--coar-pdf-page-shadow);
  /* Page wrapper is sized via inline style to the exact display dimensions, so the
     scroll container shows correct height before any canvas rasterizes. */
}

.coar-pdf-page :deep(.coar-pdf-page__canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.coar-pdf-search-overlay {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  pointer-events: none;
}

.coar-pdf-search-rect {
  position: absolute;
  background: var(--coar-pdf-search-bg, rgba(253, 224, 71, 0.55));
  mix-blend-mode: multiply;
  /* Transient — never interactive. Annotations and the textLayer stay
     reachable underneath. */
  pointer-events: none;
  border-radius: 2px;
  /* Sit above the textLayer (z:1) and below comment pins (z:10) so the
     current match is visible but pins remain clickable. */
  z-index: 5;
}
.coar-pdf-search-rect--current {
  background: var(--coar-pdf-search-current-bg, rgba(249, 115, 22, 0.7));
  outline: 2px solid var(--coar-color-accent, #2563eb);
}

/* TextLayer — mirrors the minimum subset of pdfjs's `pdf_viewer.css` needed for
   spans to be invisible-but-selectable. The `--total-scale-factor` variable is
   set per-page in JS to the current zoom; the spans' inline font-size formula
   reads it to stay aligned with the canvas at any zoom. */
.coar-pdf-page :deep(.textLayer) {
  position: absolute;
  inset: 0;
  text-align: initial;
  line-height: 1;
  overflow: clip;
  opacity: 1;
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  caret-color: CanvasText;
  /* default for text-scale-factor's depending min-font-size */
  --min-font-size: 1;
  --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
  --min-font-size-inv: calc(1 / var(--min-font-size));
  z-index: 1;
}
.coar-pdf-page :deep(.textLayer :is(span, br)) {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}
.coar-pdf-page :deep(.textLayer > :not(.markedContent)),
.coar-pdf-page :deep(.textLayer .markedContent span:not(.markedContent)) {
  z-index: 1;
  --font-height: 0;
  font-size: calc(var(--text-scale-factor) * var(--font-height));
  --scale-x: 1;
  --rotate: 0deg;
  transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
}
.coar-pdf-page :deep(.textLayer .markedContent) {
  display: contents;
}
.coar-pdf-page :deep(.textLayer ::selection) {
  background: var(--coar-pdf-selection-bg);
}
.coar-pdf-page :deep(.textLayer br::selection) {
  background: transparent;
}
.coar-pdf-page :deep(.textLayer .endOfContent) {
  display: block;
  position: absolute;
  inset: 100% 0 0;
  z-index: 0;
  cursor: default;
  user-select: none;
}

.coar-pdf-viewer__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  font-size: 0.875rem;
}

.coar-pdf-viewer__overlay--loading {
  background: rgba(255, 255, 255, 0.55);
  color: var(--coar-color-fg-muted, #6b7280);
  backdrop-filter: blur(2px);
}

.coar-pdf-viewer__overlay--error {
  background: var(--coar-pdf-overlay-bg);
  color: var(--coar-color-danger, #dc2626);
  pointer-events: auto;
}

.coar-pdf-viewer__error-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--coar-color-surface, #ffffff);
  border: 1px solid var(--coar-color-border, #e5e7eb);
  border-radius: 0.5rem;
  box-shadow: var(--coar-pdf-page-shadow);
}

.coar-pdf-viewer__error-title {
  margin: 0;
  color: var(--coar-color-fg, #1a1a1a);
}

.coar-pdf-viewer__error-retry {
  appearance: none;
  border: 1px solid var(--coar-color-border, #e5e7eb);
  background: var(--coar-color-surface-2, #f6f7f8);
  color: inherit;
  padding: 0.375rem 0.875rem;
  border-radius: 0.375rem;
  font: inherit;
  cursor: pointer;
}
.coar-pdf-viewer__error-retry:hover {
  background: var(--coar-color-surface-3, #ececec);
}
</style>
