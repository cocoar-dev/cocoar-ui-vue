<script setup lang="ts">
/**
 * Per-page annotation overlay. Renders highlights, comment pins, ink strokes,
 * and freetext boxes from a data-driven `annotations` list — read-only at this
 * stage (Task #6); editing wiring lands in Tasks #7 / #8.
 *
 * Coordinates in every annotation type are normalised to [0..1] in CSS-style
 * page-relative space (origin top-left, y grows downward). We multiply by the
 * current display dimensions on render so the same annotation lines up at any
 * zoom level without persistence churn.
 *
 * Stacking: this layer sits ABOVE the textLayer so comment pins are clickable.
 * Highlights themselves use `mix-blend-mode: multiply` + `pointer-events: none`
 * so the text underneath remains selectable through them.
 */
import { computed } from 'vue';
import type {
  CoarPdfAnnotation,
  CoarPdfCommentAnnotation,
  CoarPdfFreetextAnnotation,
  CoarPdfInkAnnotation,
  CoarPdfMarkerAnnotation,
} from '../types';

const props = defineProps<{
  /** Annotations whose `pageIndex` matches this page. */
  annotations: CoarPdfAnnotation[];
  /**
   * Display dimensions of the unrotated page in CSS pixels (= intrinsic × scale).
   * Annotation 0..1 coords are interpreted against these — at rotation 0 they
   * also match the wrapper dimensions; at rotation 90/180/270 the layer is
   * CSS-transformed onto the rotated wrapper but the internal coordinate space
   * stays unrotated.
   */
  displayWidth: number;
  displayHeight: number;
  /** Rotation in 90° steps. Drives the transform that aligns this layer with the rotated page wrapper. */
  rotation?: 0 | 90 | 180 | 270;
}>();

const emit = defineEmits<{
  /** Existing annotation was clicked — parent opens the edit popover. */
  (e: 'annotation-click', annotationId: string): void;
}>();

function px(n: number): string {
  return `${n}px`;
}

function pinStyle(a: CoarPdfCommentAnnotation) {
  return {
    left: px(a.anchor.x * props.displayWidth),
    top: px(a.anchor.y * props.displayHeight),
    background: a.color,
  };
}

function freetextStyle(a: CoarPdfFreetextAnnotation) {
  return {
    left: px(a.rect.x * props.displayWidth),
    top: px(a.rect.y * props.displayHeight),
    width: px(a.rect.w * props.displayWidth),
    height: px(a.rect.h * props.displayHeight),
    color: a.color,
    fontSize: px(a.fontSize),
  };
}

/**
 * Build an SVG `points` string for an ink polyline by mapping normalized
 * coords to display-pixel coords.
 */
function inkPoints(stroke: { x: number; y: number }[]): string {
  return stroke
    .map((p) => `${p.x * props.displayWidth},${p.y * props.displayHeight}`)
    .join(' ');
}

/**
 * Transform that rotates the unrotated coordinate space onto the rotated page
 * wrapper. The layer's own width/height stay at the unrotated dimensions; the
 * transform moves and rotates the whole layer so its (0,0)-(W,H) box lines up
 * with the wrapper's rotated extents.
 */
const transform = computed(() => {
  const r = props.rotation ?? 0;
  const w = props.displayWidth;
  const h = props.displayHeight;
  switch (r) {
    case 90:
      return `translate(${h}px, 0) rotate(90deg)`;
    case 180:
      return `translate(${w}px, ${h}px) rotate(180deg)`;
    case 270:
      return `translate(0, ${w}px) rotate(270deg)`;
    default:
      return 'none';
  }
});

const comments = computed(() =>
  props.annotations.filter((a): a is CoarPdfCommentAnnotation => a.type === 'comment'),
);
const inks = computed(() =>
  props.annotations.filter((a): a is CoarPdfInkAnnotation => a.type === 'ink'),
);
const markers = computed(() =>
  props.annotations.filter((a): a is CoarPdfMarkerAnnotation => a.type === 'marker'),
);
const freetexts = computed(() =>
  props.annotations.filter((a): a is CoarPdfFreetextAnnotation => a.type === 'freetext'),
);
</script>

<template>
  <div
    class="coar-pdf-annotation-layer"
    :style="{
      width: displayWidth + 'px',
      height: displayHeight + 'px',
      transform,
    }"
    :aria-hidden="annotations.length === 0"
  >
    <!-- Marker strokes — felt-tip highlighter style. Same SVG-polyline shape as
         ink, but rendered with `mix-blend-mode: multiply` so the page content
         reads through the stroke. Sits BELOW ink so a sharp ink pen mark stays
         crisp on top of a highlighter sweep. -->
    <svg
      v-if="markers.length > 0"
      class="coar-pdf-annotation-marker"
      :width="displayWidth"
      :height="displayHeight"
      :viewBox="`0 0 ${displayWidth} ${displayHeight}`"
      aria-hidden="true"
    >
      <g v-for="a in markers" :key="a.id" :data-annotation-id="a.id">
        <polyline
          v-for="(stroke, i) in a.strokes"
          :key="i"
          :data-stroke-index="i"
          :points="inkPoints(stroke)"
          fill="none"
          :stroke="a.color"
          :stroke-width="a.width"
          stroke-linecap="butt"
          stroke-linejoin="round"
          class="coar-pdf-annotation-marker__stroke"
          @click.stop="emit('annotation-click', a.id)"
        />
      </g>
    </svg>

    <!-- Ink strokes via SVG. The SVG itself spans the full page so polyline coordinates
         can use page-pixel space without per-stroke offsets. -->
    <svg
      v-if="inks.length > 0"
      class="coar-pdf-annotation-ink"
      :width="displayWidth"
      :height="displayHeight"
      :viewBox="`0 0 ${displayWidth} ${displayHeight}`"
      aria-hidden="true"
    >
      <g v-for="a in inks" :key="a.id" :data-annotation-id="a.id">
        <polyline
          v-for="(stroke, i) in a.strokes"
          :key="i"
          :data-stroke-index="i"
          :points="inkPoints(stroke)"
          fill="none"
          :stroke="a.color"
          :stroke-width="a.width"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="coar-pdf-annotation-ink__stroke"
          @click.stop="emit('annotation-click', a.id)"
        />
      </g>
    </svg>

    <!-- Freetext boxes — absolutely positioned text overlays. -->
    <div
      v-for="a in freetexts"
      :key="a.id"
      class="coar-pdf-annotation-freetext"
      :style="freetextStyle(a)"
      :data-annotation-id="a.id"
      @click.stop="emit('annotation-click', a.id)"
    >{{ a.text }}</div>

    <!-- Comment pins — small circular markers at an anchor point. -->
    <button
      v-for="a in comments"
      :key="a.id"
      type="button"
      class="coar-pdf-annotation-pin"
      :style="pinStyle(a)"
      :data-annotation-id="a.id"
      :title="a.comment"
      :aria-label="a.comment"
      @click.stop="emit('annotation-click', a.id)"
    >
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.coar-pdf-annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  /* Width/height/transform are set inline so the layer renders in unrotated
     page coordinates and a CSS transform places it on the rotated wrapper. */
  transform-origin: 0 0;
  pointer-events: none;
  /* IMPORTANT: no `z-index` here. Setting one would create a stacking context,
     which traps `mix-blend-mode: multiply` against the layer's own transparent
     backdrop instead of blending against the canvas+textLayer beneath. Children
     that need to paint above the textLayer (pins, freetext) set their own
     `z-index` explicitly; those rise to the nearest ancestor stacking context. */
}

.coar-pdf-annotation-ink {
  position: absolute;
  inset: 0;
  z-index: 10;
  /* The SVG itself is a pass-through; only its polylines catch hits, and only
     on the actual stroke pixels (not the polyline's bounding box). */
  pointer-events: none;
}
.coar-pdf-annotation-ink :deep(.coar-pdf-annotation-ink__stroke) {
  pointer-events: stroke;
  cursor: pointer;
}

/* Marker — felt-tip highlighter. Same hit-testing as ink, but multiply blend
   keeps the page text readable through the stroke. No z-index here (and no
   stacking context) so `mix-blend-mode` composes against the canvas+textLayer
   beneath the layer, not against the layer's own transparent backdrop. */
.coar-pdf-annotation-marker {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: multiply;
}
.coar-pdf-annotation-marker :deep(.coar-pdf-annotation-marker__stroke) {
  pointer-events: stroke;
  cursor: pointer;
}

.coar-pdf-annotation-freetext {
  position: absolute;
  z-index: 10;
  pointer-events: auto;
  cursor: pointer;
  white-space: pre-wrap;
  line-height: 1.2;
  font-family: var(--coar-font-family, sans-serif);
}

.coar-pdf-annotation-pin {
  position: absolute;
  /* Lift above the textLayer (z-index: 1 from pdfjs CSS) so clicks land on the
     pin and not on the transparent text spans behind it. */
  z-index: 10;
  width: 22px;
  height: 22px;
  margin-left: -11px;
  margin-top: -11px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: var(--coar-pdf-comment-pin-bg);
  color: var(--coar-pdf-comment-pin-fg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
  padding: 0;
}
.coar-pdf-annotation-pin:hover {
  transform: scale(1.1);
}
.coar-pdf-annotation-pin:focus-visible {
  outline: 2px solid var(--coar-color-accent, #2563eb);
  outline-offset: 2px;
}
</style>
