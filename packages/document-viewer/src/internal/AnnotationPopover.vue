<script setup lang="ts">
/**
 * Edit popover for a single annotation (existing OR draft).
 *
 * Two modes:
 *  - editing an existing annotation → comment + color swatches + delete
 *  - drafting a new comment pin → comment textarea + save + cancel
 *
 * Teleported to `<body>` so it isn't clipped by the scroll container.
 * Positioned next to its anchor rect with edge-clamp against the viewport.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { CoarDocumentViewerLabels } from "../CoarDocumentViewer.vue";

export interface AnnotationPopoverPayload {
  /** Comment text (may be empty). */
  comment: string;
  /** Selected color (CSS hex). */
  color: string;
}

const props = defineProps<{
  /** Anchor rect in viewport coordinates (from `getBoundingClientRect`). */
  anchor: DOMRect;
  /** Initial comment text. */
  initialComment: string;
  /** Initial color (CSS hex). */
  initialColor: string;
  /** Color palette to show as swatches. */
  colors: readonly string[];
  /** Whether this is a brand-new draft (shows Save/Cancel) or an edit (auto-save on change). */
  draft: boolean;
  /** All UI strings, already merged with defaults. */
  labels: Required<CoarDocumentViewerLabels>;
}>();

const emit = defineEmits<{
  /** Editing mode: each change flushes. Draft mode: only on Save click. */
  (e: 'save', payload: AnnotationPopoverPayload): void;
  (e: 'delete'): void;
  (e: 'close'): void;
}>();

const root = ref<HTMLDivElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const comment = ref(props.initialComment);
const color = ref(props.initialColor);

/** Current popover position (computed from anchor + own size). */
const pos = ref<{ top: number; left: number }>({ top: 0, left: 0 });

function reposition() {
  const el = root.value;
  if (!el) return;
  const ownW = el.offsetWidth;
  const ownH = el.offsetHeight;
  const a = props.anchor;
  // Default: drop below, left-aligned with the anchor.
  let top = a.bottom + 6;
  let left = a.left;
  // Flip up if not enough room below.
  if (top + ownH > window.innerHeight - 8) top = a.top - 6 - ownH;
  // Clamp horizontally inside the viewport.
  left = Math.max(8, Math.min(left, window.innerWidth - ownW - 8));
  pos.value = { top, left };
}

function autoSave() {
  if (props.draft) return;
  emit('save', { comment: comment.value, color: color.value });
}

/** Ctrl/Cmd+Enter commits, plain Enter inserts a newline (textarea default). */
function onTextareaKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    if (props.draft) emit('save', { comment: comment.value, color: color.value });
    else autoSave();
    textareaRef.value?.blur();
  }
}

function onDocClick(e: MouseEvent) {
  if (!root.value) return;
  if (!root.value.contains(e.target as Node)) emit('close');
}

function onDocKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
  }
}

onMounted(async () => {
  await nextTick();
  reposition();
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
  // Defer the doc click listener one tick so the click that opened us doesn't dismiss us.
  setTimeout(() => {
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onDocKey);
  }, 0);
  if (props.draft && textareaRef.value) {
    textareaRef.value.focus();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', reposition);
  window.removeEventListener('scroll', reposition, true);
  document.removeEventListener('mousedown', onDocClick);
  document.removeEventListener('keydown', onDocKey);
});

// Reposition when the anchor changes (annotation moved or different one focused).
watch(() => props.anchor, reposition, { flush: 'post' });

const isDirty = computed(
  () => comment.value !== props.initialComment || color.value !== props.initialColor,
);
</script>

<template>
  <Teleport to="body">
    <div
      ref="root"
      class="coar-pdf-annotation-popover"
      role="dialog"
      :aria-label="draft ? labels.modeNote : labels.annotationEditComment"
      :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
      @mousedown.stop
      @click.stop
    >
      <div class="coar-pdf-annotation-popover__swatches" role="radiogroup" :aria-label="labels.annotationColor">
        <button
          v-for="c in colors"
          :key="c"
          type="button"
          class="coar-pdf-annotation-popover__swatch"
          :class="{ 'coar-pdf-annotation-popover__swatch--active': c === color }"
          :style="{ background: c }"
          :aria-label="c"
          :aria-checked="c === color"
          role="radio"
          @click="color = c; autoSave()"
        />
      </div>
      <textarea
        ref="textareaRef"
        v-model="comment"
        class="coar-pdf-annotation-popover__textarea"
        rows="3"
        :placeholder="labels.annotationEditComment"
        :aria-label="labels.annotationEditComment"
        @blur="autoSave"
        @keydown="onTextareaKey"
      />
      <div class="coar-pdf-annotation-popover__actions">
        <template v-if="draft">
          <button
            type="button"
            class="coar-pdf-annotation-popover__btn coar-pdf-annotation-popover__btn--ghost"
            @click="emit('close')"
          >Cancel</button>
          <button
            type="button"
            class="coar-pdf-annotation-popover__btn coar-pdf-annotation-popover__btn--primary"
            @click="emit('save', { comment, color })"
          >Save</button>
        </template>
        <template v-else>
          <button
            type="button"
            class="coar-pdf-annotation-popover__btn coar-pdf-annotation-popover__btn--danger"
            :title="labels.annotationDelete"
            :aria-label="labels.annotationDelete"
            @click="emit('delete')"
          >{{ labels.annotationDelete }}</button>
          <button
            v-if="isDirty"
            type="button"
            class="coar-pdf-annotation-popover__btn coar-pdf-annotation-popover__btn--primary"
            @click="autoSave"
          >Save</button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.coar-pdf-annotation-popover {
  position: fixed;
  z-index: 9999;
  min-width: 220px;
  max-width: 300px;
  padding: 8px;
  background: var(--coar-color-surface, #ffffff);
  color: var(--coar-color-fg, #1a1a1a);
  border: 1px solid var(--coar-color-border, #e5e7eb);
  border-radius: 6px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.15),
    0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.coar-pdf-annotation-popover__swatches {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.coar-pdf-annotation-popover__swatch {
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}
.coar-pdf-annotation-popover__swatch--active {
  border-color: var(--coar-color-accent, #2563eb);
  outline: 1px solid var(--coar-color-surface, #ffffff);
}
.coar-pdf-annotation-popover__swatch:focus-visible {
  outline: 2px solid var(--coar-color-accent, #2563eb);
  outline-offset: 1px;
}

.coar-pdf-annotation-popover__textarea {
  width: 100%;
  resize: vertical;
  padding: 6px 8px;
  border: 1px solid var(--coar-color-border, #e5e7eb);
  border-radius: 4px;
  background: var(--coar-color-surface, #ffffff);
  color: inherit;
  font: inherit;
  box-sizing: border-box;
}
.coar-pdf-annotation-popover__textarea:focus {
  outline: 2px solid var(--coar-color-accent, #2563eb);
  outline-offset: 0;
  border-color: var(--coar-color-accent, #2563eb);
}

.coar-pdf-annotation-popover__actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.coar-pdf-annotation-popover__btn {
  appearance: none;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--coar-color-border, #e5e7eb);
  background: var(--coar-color-surface-2, #f6f7f8);
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.coar-pdf-annotation-popover__btn:hover {
  background: var(--coar-color-surface-3, #ececec);
}
.coar-pdf-annotation-popover__btn--primary {
  background: var(--coar-color-accent, #2563eb);
  border-color: var(--coar-color-accent, #2563eb);
  color: white;
}
.coar-pdf-annotation-popover__btn--primary:hover {
  background: var(--coar-color-accent-hover, #1d4ed8);
}
.coar-pdf-annotation-popover__btn--danger {
  background: transparent;
  color: var(--coar-color-danger, #dc2626);
  border-color: var(--coar-color-danger, #dc2626);
}
.coar-pdf-annotation-popover__btn--danger:hover {
  background: var(--coar-color-danger-tint, #fef2f2);
}
.coar-pdf-annotation-popover__btn--ghost {
  background: transparent;
}
</style>
