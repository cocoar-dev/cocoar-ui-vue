<script setup lang="ts">
/**
 * Vue chrome rendered inside a `CodeBlockNodeView` for the markdown editor's
 * code blocks. Owns BOTH the render-mode UI (CoarCodeBlock with Prism + an
 * Edit hover-button) AND the edit-mode UI (language `<CoarSelect>` + a slot
 * where the NodeView mounts ProseMirror's `contentDOM`).
 *
 * Toggling between modes is driven by the `editing` prop. We use `v-show`
 * (not `v-if`) so PM's `contentDOM` stays in the DOM tree the whole time —
 * unmounting it would confuse PM's view tracker.
 *
 * The `contentDOM` is appended into the `contentMount` slot via a watcher so
 * the imperative DOM hand-off happens once both refs are available. Since
 * the NodeView created `contentDOM` itself, it just hands the element across
 * — Vue never owns its children.
 */
import { useTemplateRef, watch } from 'vue';
import { CoarCodeBlock, CoarIcon, CoarSelect, type CoarSelectOption } from '@cocoar/vue-ui';

const props = defineProps<{
  /** Current code text (live-mirrored from the PM node). */
  text: string;
  /** Current language attribute (live-mirrored from the PM node). */
  language: string;
  /** True when the cursor is inside this code block. */
  editing: boolean;
  /** PM's `contentDOM` element — the NodeView creates it; the shell adopts it. */
  contentDOM: HTMLElement | null;
}>();

const emit = defineEmits<{
  /** Fired when the user clicks the "Edit" hover button on the rendered view. */
  enterEdit: [];
  /** Fired when the user picks a language in the edit-mode selector. */
  languageChange: [string];
}>();

// Limited to what `CoarCodeBlock` (Prism) actually supports. `''` (Plain text)
// is intentional — users may not want highlighting at all. The string value is
// what gets persisted in the markdown source after the ` ``` ` fence.
const languageOptions: CoarSelectOption<string>[] = [
  { value: '', label: 'Plain text' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'html', label: 'HTML' },
  { value: 'bash', label: 'Bash' },
];

const contentMount = useTemplateRef<HTMLElement>('contentMount');

// Adopt PM's `contentDOM` into our slot once both refs are populated. Runs
// once at mount; re-runs are a no-op because `appendChild` of an already-
// parented element is idempotent within the same parent.
watch(
  [contentMount, () => props.contentDOM],
  ([mount, content]) => {
    if (mount && content && content.parentElement !== mount) {
      mount.appendChild(content);
    }
  },
  { immediate: true, flush: 'post' },
);
</script>

<template>
  <div class="coar-md-code-host" :class="{ 'coar-md-code-host--editing': editing }">
    <!-- Render mode: CoarCodeBlock with Prism + hover-revealed Edit button. -->
    <div v-show="!editing" class="coar-md-code-render">
      <CoarCodeBlock
        :code="text"
        :language="language || 'text'"
        :collapsible="false"
        :show-copy="false"
      />
      <button
        class="coar-md-code-edit-btn"
        type="button"
        title="Edit code block"
        @mousedown.prevent="emit('enterEdit')"
      >
        <CoarIcon name="pencil" size="xs" />
        <span>Edit</span>
      </button>
    </div>

    <!-- Edit mode: language selector header (mirrors CoarCodeBlock's header
         layout) + the PM-managed contentDOM slot below. -->
    <div v-show="editing" class="coar-md-code-edit">
      <div class="coar-md-code-lang-row">
        <CoarSelect
          class="coar-md-code-lang-select"
          :model-value="language"
          :options="languageOptions"
          size="s"
          @update:model-value="emit('languageChange', String($event))"
        />
      </div>
      <!-- The NodeView appends contentDOM (a <pre><code>) into this slot. -->
      <div ref="contentMount" class="coar-md-code-content" />
    </div>
  </div>
</template>

<style>
.coar-md-code-host {
  position: relative;
  margin: 0.75em 0;
  /* Border radius + colour mirror CoarCodeBlock so render mode (which IS a
     CoarCodeBlock instance) and edit mode share the same outer shape. */
  border-radius: var(--coar-radius-s);
  border: 1px solid var(--coar-code-block-border, var(--coar-border-neutral));
  background: var(--coar-code-block-bg, var(--coar-background-neutral-secondary));
  overflow: hidden;
}

.coar-md-code-host--editing {
  border-color: var(--coar-background-accent-primary);
}

/* ── Render mode ────────────────────────────────────────────────────── */
.coar-md-code-render {
  position: relative;
}

.coar-md-code-edit-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--coar-text-neutral-secondary);
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease-out;
  z-index: 1;
}

.coar-md-code-render:hover .coar-md-code-edit-btn,
.coar-md-code-edit-btn:focus-visible {
  opacity: 1;
}

.coar-md-code-edit-btn:hover {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}

/* ── Edit mode ──────────────────────────────────────────────────────── */
/* Header row: dimensions (min-height + padding + background + bottom border)
   match CoarCodeBlock's `.coar-code-header` so the edit/render handover is
   visually flush — no jump in code-block height when toggling modes. */
.coar-md-code-lang-row {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  padding: var(--coar-spacing-s) 0.75rem;
  min-height: 36px;
  border-bottom: 1px solid var(--coar-code-block-border, var(--coar-border-neutral));
  background: var(--coar-code-block-header-bg, var(--coar-background-neutral-tertiary));
}

/* Compact `CoarSelect` overrides — strip its own border/background so it sits
   flush in the slim header strip and reads as part of the header chrome
   rather than a competing form control. */
.coar-md-code-lang-select {
  --coar-select-bg: transparent;
  --coar-select-border: transparent;
}

.coar-md-code-content {
  /* The NodeView appends ProseMirror's <pre><code> contentDOM here. We give
     the wrapper the visual padding/font; the inner <pre> stays bare so PM's
     text mapping isn't confused by extra padding offsets. */
  padding: var(--coar-spacing-s) 0.75rem;
  font-family: var(--coar-font-family-code, 'Cascadia Code', Consolas, Monaco, monospace);
  font-size: var(--coar-component-s-font-size, 0.85em);
  line-height: 1.5;
}

.coar-md-code-content > pre {
  margin: 0;
  padding: 0;
  background: transparent;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: inherit;
}

.coar-md-code-content > pre > code {
  display: block;
  outline: none;
  white-space: inherit;
  font-family: inherit;
}
</style>
