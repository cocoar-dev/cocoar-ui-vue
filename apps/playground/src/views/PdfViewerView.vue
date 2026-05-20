<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  CoarDocumentViewer,
  imageSource,
  imageGallerySource,
  type CoarDocumentViewerErrorEvent,
  type CoarDocumentViewerTool,
  type CoarPdfAnnotation,
  type CoarPdfAnnotationCreatePayload,
  type CoarPdfAnnotationUpdatePayload,
  type CoarPdfAnnotationMode,
  type DocumentSource,
} from '@cocoar/vue-document-viewer';
import { pdfSource } from '@cocoar/vue-document-viewer/pdf';
import '@cocoar/vue-document-viewer/styles';

type SingleSourceKind = 'pdf' | 'image';

const src = ref('');
const sourceKind = ref<SingleSourceKind>('pdf');
const withCredentials = ref(true);
/** Set by `Load gallery demo` — overrides the single-source path when present. */
const galleryUrls = ref<readonly string[] | null>(null);
const lastError = ref<CoarDocumentViewerErrorEvent | null>(null);

/**
 * Minimal toolbar layout — nav + zoom only, with a separator between them.
 * Toggle via the "Minimal toolbar" checkbox; demonstrates `tools` driving
 * both the visible set AND the order (separator placement is up to the
 * consumer; default `tools` keeps the original 8-group layout).
 */
const minimalToolbar = ref(false);
const MINIMAL_TOOLS: CoarDocumentViewerTool[] = [
  'prev-page',
  'page-input',
  'next-page',
  'separator',
  'zoom-out',
  'zoom-reset',
  'zoom-in',
];
const activeTools = computed<CoarDocumentViewerTool[] | undefined>(() =>
  minimalToolbar.value ? MINIMAL_TOOLS : undefined,
);

/**
 * Build a `DocumentSource` on every src/kind change. The viewer keeps the
 * surrounding chrome (toolbar, sidebar, annotation panel) mounted across
 * source swaps — only the inner page renderer rebinds. Returning the same
 * source reference when nothing changed (via computed) avoids spurious
 * reloads.
 */
const source = computed<DocumentSource | null>(() => {
  if (galleryUrls.value) return imageGallerySource({ urls: galleryUrls.value });
  if (!src.value) return null;
  if (sourceKind.value === 'pdf') {
    return pdfSource({ url: src.value, withCredentials: withCredentials.value });
  }
  return imageSource({ url: src.value });
});

/**
 * Inline SVG demo image — embedded as a `data:` URL so the demo works
 * offline. Shows shapes + text so visual rotation/zoom is obvious.
 */
const DEMO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <rect width="100%" height="100%" fill="#f0f9ff"/>
  <text x="600" y="120" text-anchor="middle" font-family="sans-serif" font-size="56" font-weight="700" fill="#0c4a6e">Image Source Demo</text>
  <text x="600" y="170" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#0369a1">Rendered via @cocoar/vue-document-viewer's imageSource()</text>
  <rect x="120" y="260" width="280" height="200" fill="#7c3aed" rx="16"/>
  <text x="260" y="370" text-anchor="middle" font-family="sans-serif" font-size="22" fill="white">Rectangle</text>
  <circle cx="600" cy="360" r="100" fill="#f59e0b"/>
  <text x="600" y="370" text-anchor="middle" font-family="sans-serif" font-size="22" fill="white">Circle</text>
  <polygon points="930,260 1080,460 780,460" fill="#10b981"/>
  <text x="930" y="430" text-anchor="middle" font-family="sans-serif" font-size="22" fill="white">Triangle</text>
  <text x="600" y="600" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#0c4a6e">Same viewer, no pdfjs in the loader path</text>
  <text x="600" y="640" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#475569">Toolbar tools that need PDF features (search, outline, text-select) are disabled</text>
  <text x="600" y="730" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#94a3b8">1200 × 800 px</text>
</svg>`;
const DEMO_SVG_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DEMO_SVG)}`;

/**
 * Gallery demo — three SVGs with deliberately different colors + aspect
 * ratios so per-page intrinsic dimensions are visible. Page 2 is portrait
 * (taller than wide), the others are landscape; the viewer should resize
 * each page's wrapper individually.
 */
function makeGalleryPage(opts: { idx: number; total: number; bg: string; fg: string; w: number; h: number; label: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.w} ${opts.h}" width="${opts.w}" height="${opts.h}">
  <rect width="100%" height="100%" fill="${opts.bg}"/>
  <text x="${opts.w / 2}" y="${opts.h * 0.18}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(opts.h * 0.06)}" font-weight="700" fill="${opts.fg}">Gallery page ${opts.idx} of ${opts.total}</text>
  <text x="${opts.w / 2}" y="${opts.h * 0.28}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(opts.h * 0.025)}" fill="${opts.fg}">${opts.label}</text>
  <text x="${opts.w / 2}" y="${opts.h * 0.5}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(opts.h * 0.15)}" font-weight="700" fill="${opts.fg}" opacity="0.4">${opts.idx}</text>
  <text x="${opts.w / 2}" y="${opts.h * 0.93}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(opts.h * 0.022)}" fill="${opts.fg}" opacity="0.6">${opts.w} × ${opts.h} px</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const GALLERY_DEMO_URLS = [
  makeGalleryPage({ idx: 1, total: 3, bg: '#eff6ff', fg: '#1e3a8a', w: 1200, h: 800, label: 'Landscape · cover page' }),
  makeGalleryPage({ idx: 2, total: 3, bg: '#fef3c7', fg: '#78350f', w: 800, h: 1200, label: 'Portrait · note the different aspect ratio' }),
  makeGalleryPage({ idx: 3, total: 3, bg: '#dcfce7', fg: '#14532d', w: 1400, h: 700, label: 'Wide · final page' }),
];
const fileName = ref('');
const storageKey = ref<string>('coar-pdf-playground');
const usePositionMemory = ref(true);
const showAnnotations = ref(true);
const annotationMode = ref<CoarPdfAnnotationMode>('view');

let nextId = 1;
function makeId(): string {
  return `playground-${Date.now()}-${nextId++}`;
}

/**
 * Undo/redo demo. Since the viewer is purely controlled (annotations come in
 * via prop, mutations come out as emits), the consumer owns history.
 *
 * Each mutation pushes a fresh snapshot onto the history stack and truncates
 * any "redo" tail. The current state is `history[historyIndex]`; undo/redo
 * step the index without mutating the stack.
 */
const history = ref<CoarPdfAnnotation[][]>([]);
const historyIndex = ref(0);
const HISTORY_LIMIT = 100;

const annotations = computed<CoarPdfAnnotation[]>(() => history.value[historyIndex.value] ?? []);
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);

function pushHistory(next: CoarPdfAnnotation[]) {
  const truncated = history.value.slice(0, historyIndex.value + 1);
  truncated.push(next);
  // Cap the stack so a long edit session doesn't grow without bound.
  while (truncated.length > HISTORY_LIMIT) truncated.shift();
  history.value = truncated;
  historyIndex.value = truncated.length - 1;
}

function undo() {
  if (canUndo.value) historyIndex.value -= 1;
}
function redo() {
  if (canRedo.value) historyIndex.value += 1;
}

function onAnnotationCreate(payload: CoarPdfAnnotationCreatePayload) {
  const newAnnotation = {
    ...payload,
    id: makeId(),
    createdAt: new Date().toISOString(),
    createdBy: 'playground-user',
  } as CoarPdfAnnotation;
  pushHistory([...annotations.value, newAnnotation]);
}

function onAnnotationUpdate({ id, patch }: CoarPdfAnnotationUpdatePayload) {
  pushHistory(
    annotations.value.map((a) => (a.id === id ? ({ ...a, ...patch } as CoarPdfAnnotation) : a)),
  );
}

function onAnnotationDelete(id: string) {
  pushHistory(annotations.value.filter((a) => a.id !== id));
}

function clearAll() {
  if (annotations.value.length === 0) return;
  pushHistory([]);
}

// Seed initial state — three sample annotations.
history.value = [[
  {
    id: 'c1',
    type: 'comment',
    pageIndex: 0,
    color: '#2563eb',
    createdAt: new Date().toISOString(),
    anchor: { x: 0.85, y: 0.4 },
    comment: 'Title block — looks like a course module reference.',
  },
  {
    id: 'i1',
    type: 'ink',
    pageIndex: 1,
    color: '#dc2626',
    createdAt: new Date().toISOString(),
    width: 3,
    strokes: [
      [
        { x: 0.15, y: 0.18 },
        { x: 0.25, y: 0.16 },
        { x: 0.35, y: 0.18 },
        { x: 0.45, y: 0.17 },
        { x: 0.55, y: 0.19 },
      ],
      [
        { x: 0.2, y: 0.22 },
        { x: 0.5, y: 0.23 },
      ],
    ],
  },
  {
    id: 'ft1',
    type: 'freetext',
    pageIndex: 1,
    color: '#16a34a',
    createdAt: new Date().toISOString(),
    rect: { x: 0.62, y: 0.18, w: 0.32, h: 0.08 },
    text: 'Sample freetext\nannotation',
    fontSize: 14,
  },
]];

function setSource(opts: { url: string; kind: SingleSourceKind; fileName: string; withCredentials?: boolean }) {
  if (src.value.startsWith('blob:')) URL.revokeObjectURL(src.value);
  galleryUrls.value = null;
  sourceKind.value = opts.kind;
  withCredentials.value = opts.withCredentials ?? true;
  src.value = opts.url;
  fileName.value = opts.fileName;
  lastError.value = null;
}

function onFile(ev: Event) {
  const target = ev.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  // Dispatch on MIME — picker accepts PDFs and images.
  const kind: SingleSourceKind = file.type.startsWith('image/') ? 'image' : 'pdf';
  setSource({ url: URL.createObjectURL(file), kind, fileName: file.name });
}

function loadDemo() {
  // Mozilla's pdf.js demo PDF — small, well-known, served with `ACAO: *`. That
  // means we MUST disable credentials (wildcards reject credentialed fetches).
  setSource({
    url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    kind: 'pdf',
    fileName: 'tracemonkey (mozilla pdf.js sample)',
    withCredentials: false,
  });
}

function loadImageDemo() {
  setSource({
    url: DEMO_SVG_URL,
    kind: 'image',
    fileName: 'image-demo.svg (inline data URL)',
  });
}

function loadGalleryDemo() {
  if (src.value.startsWith('blob:')) URL.revokeObjectURL(src.value);
  src.value = '';
  galleryUrls.value = GALLERY_DEMO_URLS;
  fileName.value = `image gallery demo (${GALLERY_DEMO_URLS.length} pages, mixed orientation)`;
  lastError.value = null;
}

function clear() {
  if (src.value.startsWith('blob:')) URL.revokeObjectURL(src.value);
  src.value = '';
  galleryUrls.value = null;
  fileName.value = '';
  lastError.value = null;
}

function onError(payload: CoarDocumentViewerErrorEvent) {
  lastError.value = payload;
}

function onKeyDown(e: KeyboardEvent) {
  // Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) = redo. Ignore when
  // focus is in a text-input (typing inside an annotation popover would
  // otherwise undo annotations every Ctrl+Z keystroke).
  const target = e.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  ) {
    return;
  }
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (((e.key === 'z' || e.key === 'Z') && e.shiftKey) || e.key === 'y' || e.key === 'Y') {
    e.preventDefault();
    redo();
  }
}
window.addEventListener('keydown', onKeyDown);

onBeforeUnmount(() => {
  if (src.value.startsWith('blob:')) URL.revokeObjectURL(src.value);
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div class="pdf-playground">
    <div class="pdf-controls">
      <label class="pdf-controls__file">
        <input type="file" accept="application/pdf,image/*" @change="onFile" />
        Pick a PDF or image…
      </label>
      <button class="pdf-controls__btn" @click="loadDemo">Load PDF demo</button>
      <button class="pdf-controls__btn" @click="loadImageDemo">Load image demo</button>
      <button class="pdf-controls__btn" @click="loadGalleryDemo">Load gallery demo</button>
      <button class="pdf-controls__btn" :disabled="!src && !galleryUrls" @click="clear">Clear</button>
      <label class="pdf-controls__memory">
        <input v-model="usePositionMemory" type="checkbox" />
        position memory ({{ storageKey }})
      </label>
      <label class="pdf-controls__memory">
        <input v-model="showAnnotations" type="checkbox" />
        sample annotations
      </label>
      <label class="pdf-controls__memory">
        <input v-model="minimalToolbar" type="checkbox" />
        minimal toolbar (nav + zoom only)
      </label>
      <button
        class="pdf-controls__btn"
        :disabled="!canUndo"
        title="Undo (Ctrl/Cmd+Z)"
        @click="undo"
      >
        ↶ Undo
      </button>
      <button
        class="pdf-controls__btn"
        :disabled="!canRedo"
        title="Redo (Ctrl/Cmd+Shift+Z)"
        @click="redo"
      >
        Redo ↷
      </button>
      <button
        class="pdf-controls__btn"
        :disabled="annotations.length === 0"
        @click="clearAll"
      >
        Clear all
      </button>
      <span class="pdf-controls__name">
        {{ annotations.length }} annotation(s) ·
        history {{ historyIndex + 1 }}/{{ history.length }} ·
        {{ fileName || 'No file' }}
      </span>
    </div>

    <div class="pdf-frame">
      <CoarDocumentViewer
        v-if="source"
        :source="source"
        :storage-key="usePositionMemory ? storageKey : undefined"
        :annotations="showAnnotations ? annotations : []"
        :tools="activeTools"
        v-model:annotation-mode="annotationMode"
        show-thumbnails
        show-outline
        show-annotations-panel
        show-print-download
        @error="onError"
        @annotation:create="onAnnotationCreate"
        @annotation:update="onAnnotationUpdate"
        @annotation:delete="onAnnotationDelete"
      />
      <div v-else class="pdf-empty">
        Pick a PDF / image, or hit one of the demo buttons above.
        The same viewer renders both — toolbar tools that aren't supported by the active source are disabled.
      </div>
    </div>

    <details v-if="lastError" class="pdf-error">
      <summary>Last error</summary>
      <pre>{{ String((lastError.error as Error)?.message ?? lastError.error) }}</pre>
    </details>
  </div>
</template>

<style scoped>
.pdf-playground {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  padding: 16px;
}

.pdf-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.pdf-controls__file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.pdf-controls__file input {
  font-size: 12px;
}

.pdf-controls__btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--coar-border-neutral);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.pdf-controls__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pdf-controls__memory {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.pdf-controls__name {
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
  margin-left: auto;
}

.pdf-frame {
  flex: 1 1 auto;
  min-height: 0;
  border: 1px solid var(--coar-border-neutral);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pdf-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
  padding: 16px;
  text-align: center;
}

.pdf-error {
  flex-shrink: 0;
  padding: 8px 12px;
  border: 1px solid var(--coar-border-danger, #fca5a5);
  border-radius: 6px;
  background: var(--coar-background-danger-tint, #fef2f2);
  font-size: 12px;
}
.pdf-error pre {
  margin: 6px 0 0;
  white-space: pre-wrap;
}
</style>
