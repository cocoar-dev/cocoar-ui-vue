<script setup lang="ts">
/**
 * Toolbar for CoarDocumentViewer. Built on the same `CoarSidebar` + `CoarSidebarItem`
 * + `CoarSidebarGroup` (flyout) primitives as the markdown-editor's toolbar,
 * so it inherits theming, collapsed-mode tooltips, and submenu plumbing for
 * free.
 *
 * Layout: `<CoarSidebar collapsed side={position}>` so each entry shows as an
 * icon-only button with a tooltip from its label. Drawing modes (marker, ink)
 * use a `CoarSidebarGroup mode="flyout"` to expose the stroke-width + color
 * picker — opening the picker is one hover away.
 *
 * Custom inline content (page-number input, zoom % readout) sits alongside the
 * Item children in the default slot — `CoarSidebar` accepts arbitrary VNodes.
 */
import { computed, ref, watch, type VNode } from 'vue';
import {
  CoarSidebar,
  CoarSidebarItem,
  CoarSidebarGroup,
  CoarSidebarDivider,
} from '@cocoar/vue-ui';
import {
  COAR_DOCUMENT_VIEWER_ALL_TOOLS,
  type CoarPdfAnnotationMode,
  type CoarDocumentViewerTool,
} from '../types';
import type { CoarDocumentViewerLabels } from "../CoarDocumentViewer.vue";
import type { DocumentSourceCapabilities } from '../source-types';
import { computeEffectiveTools } from './effective-tools';

const props = defineProps<{
  /** 0-based index of the topmost visible page. */
  currentPage: number;
  pageCount: number;
  zoom: number;
  /** Zoom bounds — used to grey out + / - at the limits. */
  minZoom: number;
  maxZoom: number;
  /** Pointer mode — 'pan' shows the pan button in pressed state. */
  pointerMode: 'select' | 'pan';
  /** Active annotation mode — highlights the matching button. */
  annotationMode: CoarPdfAnnotationMode;
  /** Stroke widths to show in the marker flyout (CSS px @ zoom=1). */
  markerWidthPresets: readonly number[];
  /** Stroke widths to show in the ink flyout (CSS px @ zoom=1). */
  inkWidthPresets: readonly number[];
  /** Current marker stroke width + color. */
  markerWidth: number;
  markerColor: string;
  /** Current ink stroke width + color. */
  inkWidth: number;
  inkColor: string;
  /** Color palette for the draw flyouts. */
  colors: readonly string[];
  /** All UI strings, already merged with the English defaults. */
  labels: Required<CoarDocumentViewerLabels>;
  /** Where the toolbar lives (drives `<CoarSidebar side>`). */
  side: 'left' | 'right' | 'top' | 'bottom';
  showSearch?: boolean;
  showPrintDownload?: boolean;
  showAnnotationModes?: boolean;
  showSidebarToggle?: boolean;
  sidebarOpen?: boolean;
  showAnnotationsPanelToggle?: boolean;
  annotationsPanelOpen?: boolean;
  /**
   * Toolbar layout. The array drives both the visible set AND the order
   * — pass `['prev-page', 'page-input', 'next-page', 'separator',
   * 'zoom-out', 'zoom-reset', 'zoom-in']` for a minimal "nav + zoom"
   * viewer. Use `'separator'` to place a divider. When omitted, falls
   * back to `COAR_DOCUMENT_VIEWER_ALL_TOOLS`.
   *
   * Applies on top of the coarse-grained `show*` props, so e.g. passing
   * `tools: ['search']` AND `showSearch: false` still hides the search
   * button. The intent is: `show*` toggles entire sections off, `tools`
   * cherry-picks individual buttons within sections.
   */
  tools?: CoarDocumentViewerTool[];
  /**
   * Current source's capability flags. Tools that the source can't support
   * (e.g. search on an image) stay visible but render disabled, with a
   * contextual tooltip — so the user understands the tool is real but not
   * applicable to this file type, rather than silently missing.
   */
  capabilities: DocumentSourceCapabilities;
}>();

const emit = defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'jump', pageIndex: number): void;
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'fit-width'): void;
  (e: 'fit-page'): void;
  (e: 'reset-zoom'): void;
  (e: 'set-zoom', scale: number): void;
  (e: 'reset-view'): void;
  (e: 'rotate-cw'): void;
  (e: 'rotate-ccw'): void;
  (e: 'toggle-pan'): void;
  (e: 'toggle-sidebar'): void;
  (e: 'toggle-annotations-panel'): void;
  (e: 'set-annotation-mode', mode: CoarPdfAnnotationMode): void;
  (e: 'update:marker-width', value: number): void;
  (e: 'update:marker-color', value: string): void;
  (e: 'update:ink-width', value: number): void;
  (e: 'update:ink-color', value: string): void;
  (e: 'search'): void;
  (e: 'print'): void;
  (e: 'download'): void;
}>();

defineSlots<{
  /** Trailing slot for consumer-supplied actions (e.g. share, custom modes). */
  actions?: () => VNode[];
}>();

/** Local copy of the page input so typing doesn't fight the parent's `currentPage`. */
const pageInput = ref(String(props.currentPage + 1));
const pageInputEl = ref<HTMLInputElement | null>(null);

watch(
  () => props.currentPage,
  (idx) => {
    if (document.activeElement === pageInputEl.value) return;
    pageInput.value = String(idx + 1);
  },
);

function commitPageInput() {
  const raw = pageInput.value.trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) {
    pageInput.value = String(props.currentPage + 1);
    return;
  }
  const clamped = Math.max(1, Math.min(props.pageCount, Math.round(n)));
  pageInput.value = String(clamped);
  emit('jump', clamped - 1);
}

function onPageKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitPageInput();
    pageInputEl.value?.blur();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    pageInput.value = String(props.currentPage + 1);
    pageInputEl.value?.blur();
  }
}

/* ---- Editable zoom percent input ----------------------------------- */

/** Local copy of the rendered zoom so the user can type without fighting the
 *  prop. Sync with `props.zoom` whenever the input isn't focused. */
const zoomInput = ref(String(Math.round(props.zoom * 100)));
const zoomInputEl = ref<HTMLInputElement | null>(null);

watch(
  () => props.zoom,
  (z) => {
    if (document.activeElement === zoomInputEl.value) return;
    zoomInput.value = String(Math.round(z * 100));
  },
);

function commitZoomInput() {
  // Strip whitespace and a trailing percent sign so "150", "150%", " 150 %"
  // all parse the same way. Comma-as-decimal is also tolerated for German
  // keyboards.
  const raw = zoomInput.value.trim().replace(/%$/, '').replace(',', '.').trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) {
    zoomInput.value = String(Math.round(props.zoom * 100));
    return;
  }
  const minPct = Math.round(props.minZoom * 100);
  const maxPct = Math.round(props.maxZoom * 100);
  const clamped = Math.max(minPct, Math.min(maxPct, Math.round(n)));
  zoomInput.value = String(clamped);
  emit('set-zoom', clamped / 100);
}

function onZoomKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitZoomInput();
    zoomInputEl.value?.blur();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    zoomInput.value = String(Math.round(props.zoom * 100));
    zoomInputEl.value?.blur();
  }
}

function onZoomFocus() {
  // Select-all on focus so a fresh value can be typed without backspacing.
  zoomInputEl.value?.select();
}

const canPrev = computed(() => props.currentPage > 0);
const canNext = computed(() => props.currentPage < props.pageCount - 1);
const canZoomIn = computed(() => props.zoom < props.maxZoom - 1e-6);
const canZoomOut = computed(() => props.zoom > props.minZoom + 1e-6);

/** Map a stroke width to a swatch dot size for the flyout. */
function previewSize(w: number, kind: 'marker' | 'ink'): number {
  if (kind === 'marker') return Math.min(22, Math.max(8, w * 0.7));
  return Math.min(16, Math.max(3, w * 2));
}

/**
 * True when the current source's capabilities can't support this tool —
 * caller ORs it with any local disabled-flag (e.g. `canPrev`). Tools that
 * are universally available (zoom, rotate, modes) return false here.
 */
function disabledByCapability(tool: CoarDocumentViewerTool): boolean {
  const caps = props.capabilities;
  switch (tool) {
    case 'prev-page':
    case 'next-page':
    case 'page-input':
      return !caps.multiPage;
    case 'search':
      return !caps.search;
    case 'print':
      return !caps.print;
    default:
      return false;
  }
}

/** Tooltip helper that appends a "not available for this file" suffix when
 *  the tool is disabled by capability. Pure pass-through otherwise. */
function tipFor(tool: CoarDocumentViewerTool, baseLabel: string): string {
  return disabledByCapability(tool)
    ? `${baseLabel} — ${props.labels.notAvailableForSource}`
    : baseLabel;
}

/**
 * Final list of tools to render, in the requested order. We start with the
 * user-supplied `tools` array (or the default), then strip entries whose
 * section toggle is off (showSearch/showPrintDownload/etc), then trim
 * leading/trailing separators and collapse consecutive ones so the user
 * doesn't have to worry about the section being filtered out from under a
 * separator they placed.
 */
const effectiveTools = computed<readonly CoarDocumentViewerTool[]>(() =>
  computeEffectiveTools(props.tools ?? COAR_DOCUMENT_VIEWER_ALL_TOOLS, {
    showSidebarToggle: props.showSidebarToggle,
    showAnnotationsPanelToggle: props.showAnnotationsPanelToggle,
    showSearch: props.showSearch,
    showPrintDownload: props.showPrintDownload,
    showAnnotationModes: props.showAnnotationModes,
  }),
);
</script>

<template>
  <CoarSidebar
    :side="side"
    :collapsed="true"
    size="s"
    variant="primary"
    :borderless="false"
    :aria-label="labels.pageOf"
    class="coar-pdf-toolbar"
  >
    <!-- Tools render in the order given by `effectiveTools`. Each entry maps
         to one branch below; section-toggle filtering + separator collapsing
         happens upstream in `effectiveTools`, so the template stays a plain
         list-of-cases. -->
    <template v-for="(tool, idx) in effectiveTools" :key="`${tool}-${idx}`">
      <CoarSidebarDivider v-if="tool === 'separator'" />

      <CoarSidebarItem
        v-else-if="tool === 'sidebar-toggle'"
        icon="panel-left"
        :label="labels.thumbnails"
        :active="sidebarOpen"
        @click="emit('toggle-sidebar')"
      />
      <CoarSidebarItem
        v-else-if="tool === 'annotations-panel'"
        icon="panel-right"
        :label="labels.annotationsPanel"
        :active="annotationsPanelOpen"
        @click="emit('toggle-annotations-panel')"
      />

      <CoarSidebarItem
        v-else-if="tool === 'prev-page'"
        icon="chevron-up"
        :label="tipFor('prev-page', labels.prevPage)"
        :disabled="!canPrev || disabledByCapability('prev-page')"
        @click="emit('prev')"
      />
      <div
        v-else-if="tool === 'page-input'"
        class="coar-pdf-toolbar__inline-page"
        :class="{ 'coar-pdf-toolbar__inline-page--disabled': disabledByCapability('page-input') }"
        role="group"
        :aria-label="labels.pageJumpAria"
      >
        <input
          ref="pageInputEl"
          v-model="pageInput"
          class="coar-pdf-toolbar__page-input"
          type="text"
          inputmode="numeric"
          :aria-label="labels.pageJumpAria"
          :title="tipFor('page-input', labels.pageJumpAria)"
          :disabled="disabledByCapability('page-input')"
          @blur="commitPageInput"
          @keydown="onPageKey"
        />
        <span class="coar-pdf-toolbar__page-sep" aria-hidden="true">/</span>
        <span class="coar-pdf-toolbar__page-total">{{ pageCount }}</span>
      </div>
      <CoarSidebarItem
        v-else-if="tool === 'next-page'"
        icon="chevron-down"
        :label="tipFor('next-page', labels.nextPage)"
        :disabled="!canNext || disabledByCapability('next-page')"
        @click="emit('next')"
      />

      <CoarSidebarItem
        v-else-if="tool === 'zoom-out'"
        icon="minus"
        :label="labels.zoomOut"
        :disabled="!canZoomOut"
        @click="emit('zoom-out')"
      />
      <div
        v-else-if="tool === 'zoom-reset'"
        class="coar-pdf-toolbar__zoom-readout"
        role="group"
        :aria-label="labels.zoomLevel"
      >
        <input
          ref="zoomInputEl"
          v-model="zoomInput"
          class="coar-pdf-toolbar__zoom-input"
          type="text"
          inputmode="numeric"
          :aria-label="labels.zoomLevel"
          :title="labels.zoomLevel"
          @blur="commitZoomInput"
          @keydown="onZoomKey"
          @focus="onZoomFocus"
        />
        <span class="coar-pdf-toolbar__zoom-suffix" aria-hidden="true">%</span>
      </div>
      <CoarSidebarItem
        v-else-if="tool === 'zoom-in'"
        icon="plus"
        :label="labels.zoomIn"
        :disabled="!canZoomIn"
        @click="emit('zoom-in')"
      />

      <CoarSidebarItem
        v-else-if="tool === 'fit-width'"
        icon="move-horizontal"
        :label="labels.fitWidth"
        @click="emit('fit-width')"
      />
      <CoarSidebarItem
        v-else-if="tool === 'fit-page'"
        icon="file-text"
        :label="labels.fitPage"
        @click="emit('fit-page')"
      />
      <CoarSidebarItem
        v-else-if="tool === 'reset-view'"
        icon="refresh-cw"
        :label="labels.resetView"
        @click="emit('reset-view')"
      />

      <CoarSidebarItem
        v-else-if="tool === 'rotate-ccw'"
        icon="rotate-ccw"
        :label="labels.rotateCcw"
        @click="emit('rotate-ccw')"
      />
      <CoarSidebarItem
        v-else-if="tool === 'rotate-cw'"
        icon="rotate-cw"
        :label="labels.rotateCw"
        @click="emit('rotate-cw')"
      />

      <CoarSidebarItem
        v-else-if="tool === 'pan'"
        icon="hand"
        :label="labels.pan"
        :active="pointerMode === 'pan'"
        @click="emit('toggle-pan')"
      />
      <CoarSidebarItem
        v-else-if="tool === 'select'"
        icon="mouse-pointer-2"
        :label="labels.modeSelect"
        :active="annotationMode === 'select'"
        @click="emit('set-annotation-mode', annotationMode === 'select' ? 'view' : 'select')"
      />
      <CoarSidebarItem
        v-else-if="tool === 'eraser'"
        icon="eraser"
        :label="labels.modeEraser"
        :active="annotationMode === 'eraser'"
        @click="emit('set-annotation-mode', annotationMode === 'eraser' ? 'view' : 'eraser')"
      />

      <!-- Marker → split trigger: click activates the tool, hover opens the
           flyout with stroke-width + color picker. -->
      <CoarSidebarGroup
        v-else-if="tool === 'marker'"
        icon="highlighter"
        :label="labels.modeMarker"
        mode="flyout"
        :open-on-hover="true"
        :split-trigger="true"
        :active="annotationMode === 'marker'"
        @trigger-click="emit('set-annotation-mode', annotationMode === 'marker' ? 'view' : 'marker')"
      >
        <div class="coar-pdf-toolbar__flyout">
          <div class="coar-pdf-toolbar__flyout-row" :aria-label="labels.strokeWidth">
            <button
              v-for="w in markerWidthPresets"
              :key="w"
              type="button"
              class="coar-pdf-toolbar__flyout-width"
              :class="{ 'coar-pdf-toolbar__flyout-width--active': Math.abs(markerWidth - w) < 0.01 }"
              :title="`${w}px`"
              :aria-label="`${w}px`"
              :aria-pressed="Math.abs(markerWidth - w) < 0.01"
              @click="emit('update:marker-width', w)"
            >
              <span
                class="coar-pdf-toolbar__flyout-width-dot"
                :style="{
                  width: previewSize(w, 'marker') + 'px',
                  height: previewSize(w, 'marker') + 'px',
                  background: markerColor,
                }"
              />
            </button>
          </div>
          <div class="coar-pdf-toolbar__flyout-row" role="radiogroup" :aria-label="labels.annotationColor">
            <button
              v-for="c in colors"
              :key="c"
              type="button"
              class="coar-pdf-toolbar__flyout-color"
              :class="{ 'coar-pdf-toolbar__flyout-color--active': c === markerColor }"
              :title="c"
              :aria-label="c"
              :aria-checked="c === markerColor"
              role="radio"
              :style="{ background: c }"
              @click="emit('update:marker-color', c)"
            />
          </div>
        </div>
      </CoarSidebarGroup>

      <CoarSidebarItem
        v-else-if="tool === 'note'"
        icon="message-square"
        :label="labels.modeNote"
        :active="annotationMode === 'comment'"
        @click="emit('set-annotation-mode', annotationMode === 'comment' ? 'view' : 'comment')"
      />

      <!-- Ink → split trigger: click activates the tool, hover opens the
           flyout with stroke-width + color picker. -->
      <CoarSidebarGroup
        v-else-if="tool === 'ink'"
        icon="pencil"
        :label="labels.modeInk"
        mode="flyout"
        :open-on-hover="true"
        :split-trigger="true"
        :active="annotationMode === 'ink'"
        @trigger-click="emit('set-annotation-mode', annotationMode === 'ink' ? 'view' : 'ink')"
      >
        <div class="coar-pdf-toolbar__flyout">
          <div class="coar-pdf-toolbar__flyout-row" :aria-label="labels.strokeWidth">
            <button
              v-for="w in inkWidthPresets"
              :key="w"
              type="button"
              class="coar-pdf-toolbar__flyout-width"
              :class="{ 'coar-pdf-toolbar__flyout-width--active': Math.abs(inkWidth - w) < 0.01 }"
              :title="`${w}px`"
              :aria-pressed="Math.abs(inkWidth - w) < 0.01"
              @click="emit('update:ink-width', w)"
            >
              <span
                class="coar-pdf-toolbar__flyout-width-dot"
                :style="{
                  width: previewSize(w, 'ink') + 'px',
                  height: previewSize(w, 'ink') + 'px',
                  background: inkColor,
                }"
              />
            </button>
          </div>
          <div class="coar-pdf-toolbar__flyout-row" role="radiogroup" :aria-label="labels.annotationColor">
            <button
              v-for="c in colors"
              :key="c"
              type="button"
              class="coar-pdf-toolbar__flyout-color"
              :class="{ 'coar-pdf-toolbar__flyout-color--active': c === inkColor }"
              :title="c"
              :aria-checked="c === inkColor"
              role="radio"
              :style="{ background: c }"
              @click="emit('update:ink-color', c)"
            />
          </div>
        </div>
      </CoarSidebarGroup>

      <CoarSidebarItem
        v-else-if="tool === 'freetext'"
        icon="type"
        :label="labels.modeFreetext"
        :active="annotationMode === 'freetext'"
        @click="emit('set-annotation-mode', annotationMode === 'freetext' ? 'view' : 'freetext')"
      />

      <CoarSidebarItem
        v-else-if="tool === 'search'"
        icon="search"
        :label="tipFor('search', labels.search)"
        :disabled="disabledByCapability('search')"
        @click="emit('search')"
      />
      <CoarSidebarItem
        v-else-if="tool === 'print'"
        icon="printer"
        :label="tipFor('print', labels.print)"
        :disabled="disabledByCapability('print')"
        @click="emit('print')"
      />
      <CoarSidebarItem
        v-else-if="tool === 'download'"
        icon="download"
        :label="labels.download"
        @click="emit('download')"
      />
    </template>

    <slot v-if="$slots.actions" name="actions" />
  </CoarSidebar>
</template>

<style scoped>
.coar-pdf-toolbar {
  /* Sidebar's intrinsic min-width can stretch the toolbar in horizontal mode;
     keep the wrap consistent with the rest of the viewer chrome. */
  flex: 0 0 auto;
}

/* Inline page input — sits next to the prev/next sidebar items. */
.coar-pdf-toolbar__inline-page {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}
/* Single-page source (image): grey out the input so it visually matches
   the disabled prev/next neighbours. The input itself also gets the native
   `disabled` attribute set, so keyboard focus skips it. */
.coar-pdf-toolbar__inline-page--disabled {
  opacity: 0.4;
}
.coar-pdf-toolbar__inline-page--disabled .coar-pdf-toolbar__page-input {
  cursor: not-allowed;
}

/* Editable zoom-percent readout — a small text input + a static "%" suffix.
   Mirrors the page-input style so the toolbar's two free-form inputs feel
   like siblings. */
.coar-pdf-toolbar__zoom-readout {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 6px;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}

.coar-pdf-toolbar__zoom-input {
  width: 3.2em;
  height: 22px;
  padding: 0 4px;
  border: 1px solid var(--coar-color-border, #e5e7eb);
  border-radius: 4px;
  background: var(--coar-color-surface, #ffffff);
  color: inherit;
  font: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  outline: none;
}
.coar-pdf-toolbar__zoom-input:focus-visible {
  border-color: var(--coar-color-accent, #2563eb);
  box-shadow: 0 0 0 2px var(--coar-color-accent-tint, rgba(37, 99, 235, 0.2));
}

.coar-pdf-toolbar__zoom-suffix {
  color: var(--coar-color-fg-muted, #6b7280);
  pointer-events: none;
}

.coar-pdf-toolbar__page-input {
  width: 3em;
  height: 22px;
  padding: 0 4px;
  border: 1px solid var(--coar-color-border, #e5e7eb);
  border-radius: 4px;
  background: var(--coar-color-surface, #ffffff);
  color: inherit;
  font: inherit;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.coar-pdf-toolbar__page-input:focus {
  outline: 2px solid var(--coar-color-accent, #2563eb);
  outline-offset: 0;
  border-color: var(--coar-color-accent, #2563eb);
}

.coar-pdf-toolbar__page-sep,
.coar-pdf-toolbar__page-total {
  color: var(--coar-color-fg-muted, #6b7280);
}

/* Flyout panel content — bordered card with stroke-width row + color row. */
.coar-pdf-toolbar__flyout {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  min-width: 220px;
}

.coar-pdf-toolbar__flyout-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.coar-pdf-toolbar__flyout-width {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
}
.coar-pdf-toolbar__flyout-width:hover {
  background: var(--coar-color-surface-3, rgba(0, 0, 0, 0.05));
}
.coar-pdf-toolbar__flyout-width--active {
  border-color: var(--coar-color-accent, #2563eb);
}
.coar-pdf-toolbar__flyout-width-dot {
  display: block;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
}

.coar-pdf-toolbar__flyout-color {
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}
.coar-pdf-toolbar__flyout-color--active {
  border-color: var(--coar-color-accent, #2563eb);
  outline: 1px solid var(--coar-color-surface, #ffffff);
}
.coar-pdf-toolbar__flyout-color:focus-visible {
  outline: 2px solid var(--coar-color-accent, #2563eb);
  outline-offset: 1px;
}
</style>
