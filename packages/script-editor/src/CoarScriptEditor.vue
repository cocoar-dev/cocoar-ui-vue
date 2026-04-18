<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import {
  useMonacoEditor,
  type CoarScriptEditorLanguage,
  type CoarScriptEditorVariant,
} from './composables/useMonacoEditor';
import { useExtraLibs, type CoarScriptEditorExtraLib } from './composables/useExtraLibs';
import { useConstrainedRegions } from './composables/useConstrainedRegions';
import { useFormFieldContext } from './composables/useFormFieldContext';
import type { CoarScriptEditorTheme } from './theme';

export type CoarScriptEditorRejectReason = 'edit-overlaps-locked-line';

/**
 * Payload emitted by `@reject` when the guard rolls back an illegal edit. The shape is an
 * object (not a bare string) so additional context can be added later without a breaking
 * change — new fields stay optional.
 */
export interface CoarScriptEditorRejectEvent {
  reason: CoarScriptEditorRejectReason;
  /** 1-based line range of the edit that got rejected, if available. */
  range?: { startLineNumber: number; endLineNumber: number };
}

export interface CoarScriptEditorProps {
  /**
   * Editor source. Any line containing `// @locked` (anywhere in the line) is protected
   * from edits — including against being merged with its neighbours. Everything else is
   * freely editable. The markers stay in the text, so the emitted value round-trips.
   */
  modelValue?: string;
  /**
   * Authoring mode. When true, lock enforcement is suspended so template authors can
   * modify locked lines, add new `// @locked` lines, or remove existing markers. Markers
   * render at full size with an accent colour so it's visually obvious that enforcement
   * is off.
   */
  authoring?: boolean;
  language?: CoarScriptEditorLanguage;
  /** Read-only mode — user cannot edit but cursor, selection, and copy still work. */
  readonly?: boolean;
  /** Disabled state — non-interactive, dimmed, tab-skipped. Auto-picked up from CoarFormField. */
  disabled?: boolean;
  /** Error state — red border. Auto-picked up from CoarFormField.error. */
  error?: boolean;
  /** Placeholder text shown when the editor is empty and not focused. */
  placeholder?: string;
  /** Marks the field as required (sets aria-required; no enforcement). */
  required?: boolean;
  /** Autofocus on mount. */
  autofocus?: boolean;
  /** HTML id attribute. Auto-generated if omitted; CoarFormField's id takes precedence. */
  id?: string;
  /** HTML name attribute (informational — editor is not a native form control). */
  name?: string;
  /** Explicit height. Accepts CSS string (`"160px"`, `"40%"`) or number (pixels). */
  height?: string | number;
  /**
   * UI preset.
   *  - `'editor'` (default): full IDE chrome — line numbers, gutter, minimap-ready
   *  - `'inline'`: compact form-field look — no line numbers, no gutter, tight padding
   */
  variant?: CoarScriptEditorVariant;
  /**
   * Explicitly toggle line numbers, overriding the variant default (`'editor'` → on,
   * `'inline'` → off). Leave undefined to inherit from the variant. When off, a small
   * decoration column keeps the text from touching the left border.
   */
  lineNumbers?: boolean;
  /**
   * When true, suppresses diagnostic codes that flag "script body" constructs in TS/JS
   * (top-level return/await/export, implicit any, etc). **Global side-effect** — affects
   * all TS/JS editors on the page. No-op for JSON.
   */
  scriptMode?: boolean;
  /**
   * Hidden + locked prefix providing per-editor type context, e.g.
   * `"declare const query: TodoQuery;"`. Rendered invisibly above the user script, so
   * IntelliSense resolves against its declarations while the user can't see or edit it.
   * Does not round-trip through `modelValue`.
   */
  preamble?: string;
  minimap?: boolean;
  theme?: CoarScriptEditorTheme;
  /** TypeScript declaration files made available for autocomplete and type checking. */
  extraLibs?: CoarScriptEditorExtraLib[];
  /**
   * Override the DOM node Monaco uses for overflow widgets (IntelliSense popup, hover,
   * parameter hints). Set this when the editor is mounted inside a custom modal or overlay
   * and you want the widgets in that modal's stacking context.
   *
   * For the Cocoar dialog (`useDialog().open(...)`) this is auto-detected — pass `null` to
   * fall back to Monaco's default body-level container.
   */
  overflowWidgetsDomNode?: HTMLElement | null;
}

const props = withDefaults(defineProps<CoarScriptEditorProps>(), {
  modelValue: '',
  authoring: false,
  language: 'typescript',
  readonly: false,
  disabled: false,
  error: false,
  placeholder: '',
  required: false,
  autofocus: false,
  id: '',
  name: '',
  height: undefined,
  variant: 'editor',
  lineNumbers: undefined,
  scriptMode: false,
  preamble: '',
  minimap: false,
  theme: 'auto',
  extraLibs: () => [],
  overflowWidgetsDomNode: null,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'reject', event: CoarScriptEditorRejectEvent): void;
  (e: 'focused'): void;
  (e: 'blurred'): void;
}>();

const host = ref<HTMLElement | null>(null);
let lastEmittedValue = props.modelValue;

// CoarFormField integration — auto-picks up id / error / describedBy when wrapped.
const formField = useFormFieldContext();
const autoId = `coar-script-editor-${useId()}`;
const inputId = computed(() => props.id || formField?.inputId.value || autoId);
const hasError = computed(() => props.error || (formField?.hasError.value ?? false));
const describedBy = computed(() => formField?.messageId.value);
const isDisabled = computed(() => props.disabled || (formField?.disabled.value ?? false));

const isFocused = ref(false);
const isEmpty = ref(props.modelValue.length === 0);

const rootClass = computed(() => ({
  'coar-script-editor': true,
  'coar-script-editor--authoring': props.authoring,
  'coar-script-editor--inline': props.variant === 'inline',
  'coar-script-editor--disabled': isDisabled.value,
  'coar-script-editor--error': hasError.value,
  'coar-script-editor--show-placeholder':
    !!props.placeholder && isEmpty.value && !isFocused.value && !isDisabled.value,
}));

const rootStyle = computed<Record<string, string>>(() => {
  if (props.height === undefined || props.height === '') return {} as Record<string, string>;
  const value = typeof props.height === 'number' ? `${props.height}px` : props.height;
  return { height: value, minHeight: '0' };
});

const { editor, model, setValue } = useMonacoEditor({
  host,
  initialValue: () => props.modelValue,
  language: () => props.language,
  readonly: () => props.readonly || isDisabled.value,
  minimap: () => props.minimap,
  theme: () => props.theme,
  variant: () => props.variant,
  lineNumbers: () => props.lineNumbers,
  preamble: () => props.preamble,
  scriptMode: () => props.scriptMode,
  autofocus: () => props.autofocus,
  overflowWidgetsDomNode: () => props.overflowWidgetsDomNode,
  onContentChange: (value) => {
    lastEmittedValue = value;
    isEmpty.value = value.length === 0;
    emit('update:modelValue', value);
  },
  onFocused: () => {
    isFocused.value = true;
    emit('focused');
  },
  onBlurred: () => {
    isFocused.value = false;
    emit('blurred');
  },
});

useExtraLibs({
  language: () => props.language,
  libs: () => props.extraLibs,
});

useConstrainedRegions({
  editor,
  value: () => props.modelValue,
  authoring: () => props.authoring,
  onReject: (event) => emit('reject', event),
});

watch(
  () => props.modelValue,
  (value) => {
    isEmpty.value = value.length === 0;
    if (value === lastEmittedValue) return;
    setValue(value);
  },
);

defineExpose({
  getEditor: () => editor.value,
  getModel: () => model.value,
  focus: () => editor.value?.focus(),
});
</script>

<template>
  <div
    :id="inputId"
    ref="host"
    :class="rootClass"
    :style="rootStyle"
    :aria-invalid="hasError ? 'true' : undefined"
    :aria-describedby="describedBy"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :aria-required="required ? 'true' : undefined"
    :data-placeholder="placeholder || undefined"
    :data-name="name || undefined"
  />
</template>

<style>
.coar-script-editor {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 200px;
  border: 1px solid var(--coar-border-input, var(--coar-border-neutral-tertiary, #e5e7eb));
  border-radius: var(--coar-radius-xs, 4px);
  overflow: hidden;
  background: var(--coar-background-neutral-primary, #ffffff);
  transition:
    border-color var(--coar-duration-fast, 150ms) var(--coar-ease-out, ease-out),
    box-shadow var(--coar-duration-fast, 150ms) var(--coar-ease-out, ease-out);

  /*
   * Marker + locked-line styling. Override these CSS vars per editor (inline style or
   * higher-level theme) for custom looks.
   */
  --coar-script-editor-marker-scale: 0.6;
  --coar-script-editor-marker-opacity: 0.45;
  --coar-script-editor-marker-color: var(--coar-text-neutral-tertiary, #6b7280);
  --coar-script-editor-locked-line-bg: color-mix(
    in srgb,
    var(--coar-text-neutral-tertiary, #6b7280) 6%,
    transparent
  );
}

/* Inline variant — tighter min-height, lighter default, hover feedback like CoarTextInput. */
.coar-script-editor--inline {
  min-height: 0;
}

.coar-script-editor--inline:not(.coar-script-editor--disabled):hover {
  border-color: var(--coar-border-input-hover, #9ca3af);
}

.coar-script-editor--inline:focus-within:not(.coar-script-editor--error) {
  border-color: var(--coar-focus-color, #3b82f6);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color, #3b82f6);
}

/* Error state — red border, overrides focus ring while errored. */
.coar-script-editor--error {
  border-color: var(--coar-border-semantic-error-bold, #dc2626);
}

.coar-script-editor--error:focus-within {
  border-color: var(--coar-border-semantic-error-bold, #dc2626);
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold, #dc2626);
}

/* Disabled — dim + block pointer interactions so the cursor doesn't enter. */
.coar-script-editor--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
  background: var(--coar-surface-input-disabled, #f3f4f6);
}

/* Placeholder — rendered as pseudo-element over the editor chrome when empty + unfocused. */
.coar-script-editor--show-placeholder::after {
  content: attr(data-placeholder);
  position: absolute;
  top: 8px;
  left: 12px;
  color: var(--coar-text-placeholder, #9ca3af);
  font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 13px;
  pointer-events: none;
  white-space: pre-line;
  z-index: 1;
}

/* Shift placeholder in `'editor'` variant to clear the gutter. */
.coar-script-editor:not(.coar-script-editor--inline).coar-script-editor--show-placeholder::after {
  left: 68px;
}

/* Authoring mode — markers at normal size, warm accent so it reads as "enforcement off". */
.coar-script-editor--authoring {
  --coar-script-editor-marker-scale: 1;
  --coar-script-editor-marker-opacity: 0.85;
  --coar-script-editor-marker-color: var(--coar-text-warning, #b45309);
  --coar-script-editor-locked-line-bg: color-mix(
    in srgb,
    var(--coar-text-warning, #b45309) 10%,
    transparent
  );
}

.coar-script-editor-locked-line {
  background: var(--coar-script-editor-locked-line-bg);
}

.coar-script-editor-locked-marker {
  font-size: calc(1em * var(--coar-script-editor-marker-scale));
  opacity: var(--coar-script-editor-marker-opacity);
  letter-spacing: -0.02em;
  color: var(--coar-script-editor-marker-color);
}
</style>
