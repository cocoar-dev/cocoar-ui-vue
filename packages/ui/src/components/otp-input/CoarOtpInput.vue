<script setup lang="ts">
/**
 * `CoarOtpInput` — N-cell one-character-per-cell input for OTP / 2FA
 * verification codes, PINs, claim codes.
 *
 * Behavior:
 *   - One `<input maxlength="1">` per position (default 6).
 *   - Typing in cell `i` auto-advances focus to cell `i + 1`.
 *   - Backspace on an empty cell clears + jumps to cell `i − 1`;
 *     Backspace on a filled cell clears its own value (stays put).
 *   - Arrow Left/Right navigate between cells; Home / End jump
 *     to the first / last cell.
 *   - Paste of a multi-char string spreads across cells starting
 *     from the current focused cell. Useful for users who copy the
 *     code from their authenticator app.
 *   - `complete` event fires the moment all cells are filled — wire
 *     to your form submit so the user doesn't have to click anything.
 *   - `type='numeric'` (default) rejects non-digits at the keystroke
 *     level + sets `inputmode='numeric'` so mobile keyboards open in
 *     numeric mode. `'alphanumeric'` allows `[A-Za-z0-9]`; `'text'`
 *     accepts anything single-char.
 *
 * v-model is the assembled string. Reading "" / "1" / "12" / … /
 * "123456" works at any partial-fill state. Writing an external
 * value (e.g. paste from a parent) spreads chars into cells; extra
 * chars beyond `length` are silently dropped.
 *
 * Form-field integration: same `FORM_FIELD_INJECTION_KEY` pattern
 * as `CoarTextInput` — drop inside a `<CoarFormField label="…"
 * error="…">` and the error state is picked up automatically.
 */

import { computed, inject, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';

export type CoarOtpInputSize = 'xs' | 's' | 'm' | 'l';

export type CoarOtpInputType = 'numeric' | 'alphanumeric' | 'text';

export interface CoarOtpInputProps {
  /** Number of cells. Default 6 (most common: TOTP / SMS codes). */
  length?: number;
  /**
   * Character class accepted in each cell. `'numeric'` filters to
   * `[0-9]` and sets `inputmode='numeric'`. `'alphanumeric'` allows
   * `[A-Za-z0-9]`. `'text'` accepts anything (1 char per cell).
   */
  type?: CoarOtpInputType;
  /**
   * Render cells as `<input type="password">` so the value is
   * visually masked while still keyboard-accessible. Useful for
   * PINs / sensitive codes.
   */
  mask?: boolean;
  /** Focus the first cell on mount. */
  autoFocus?: boolean;
  /** Cell size. Matches `CoarTextInput` sizing tokens. */
  size?: CoarOtpInputSize;
  /** Disables all cells. */
  disabled?: boolean;
  /** Makes all cells read-only. */
  readonly?: boolean;
  /** Marks the group as required. Picked up by `CoarFormField`. */
  required?: boolean;
  /** Error state. Auto-injected from `CoarFormField` when present. */
  error?: boolean;
  /** Single-char placeholder shown in empty cells. */
  placeholder?: string;
  /** HTML `id` for the first cell (and aria reference target). */
  id?: string;
  /** HTML `name` attribute prefix (each cell gets `${name}-${i}`). */
  name?: string;
  /**
   * `autocomplete` value for the input cells. Default `'one-time-code'`
   * so iOS / Android offer the SMS autofill chip when a code arrives.
   */
  autocomplete?: string;
  /**
   * Transform a single character before it's committed to its cell.
   * Runs BEFORE the `type` check + `accept` filter, so the transformed
   * char is what gets validated. Common uses:
   *   - `c => c.toUpperCase()` — auto-uppercase alphanumeric codes
   *   - `c => c.replace(/\s/, '')` — strip whitespace from pastes
   * Return an empty string (or longer string) to drop the character.
   */
  transform?: (char: string) => string;
  /**
   * Additional per-character accept predicate. Runs AFTER `type` and
   * `transform`. Return `false` to reject the character. Use when the
   * built-in `numeric` / `alphanumeric` / `text` classes are close but
   * not quite right — e.g. block visually-ambiguous chars in claim
   * codes: `c => !/[O0lI1]/.test(c)`.
   */
  accept?: (char: string) => boolean;
}

const props = withDefaults(defineProps<CoarOtpInputProps>(), {
  length: 6,
  type: 'numeric',
  mask: false,
  autoFocus: false,
  size: 'm',
  disabled: false,
  readonly: false,
  required: false,
  error: false,
  placeholder: '',
  id: '',
  name: '',
  autocomplete: 'one-time-code',
  // Hooks default to undefined — both are optional escape hatches; absence is
  // the common case. Declared explicitly to satisfy `vue/require-default-prop`.
  transform: undefined,
  accept: undefined,
});

const model = defineModel<string>({ default: '' });

const emit = defineEmits<{
  /** Fired once all cells are filled. Payload is the assembled string. */
  complete: [value: string];
  focused: [event: FocusEvent];
  blurred: [event: FocusEvent];
}>();

const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

const { t } = useI18n();

const cells = ref<string[]>(Array.from({ length: props.length }, () => ''));
const cellRefs = useTemplateRef<HTMLInputElement[]>('cellRefs');
const focusedIndex = ref<number | null>(null);

const autoId = `coar-otp-input-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || formField?.inputId.value || autoId);
const hasError = computed(() => props.error || (formField?.hasError.value ?? false));
const describedBy = computed(() => formField?.messageId.value || undefined);

// ─── Model ↔ cells sync ───────────────────────────────────────────

const internalUpdate = ref(false);

// Cells → model (one direction)
function syncCellsToModel(): void {
  internalUpdate.value = true;
  model.value = cells.value.join('');
  // Reset flag on next tick — the model watcher reads it.
  nextTick(() => {
    internalUpdate.value = false;
  });
}

// Model → cells (other direction). Triggered on external writes
// (parent sets v-model, paste handled separately).
watch(
  () => model.value,
  (next) => {
    if (internalUpdate.value) return;
    spreadValueAcrossCells(next ?? '');
  },
);

// Initial fill from props.
if (model.value) {
  spreadValueAcrossCells(model.value);
}

function spreadValueAcrossCells(value: string): void {
  const sanitized = sanitizeInput(value, props.length);
  for (let i = 0; i < props.length; i++) {
    cells.value[i] = sanitized[i] ?? '';
  }
}

// Re-shape cells if `length` changes (rare, but `MaybeRefOrGetter`-
// shaped consumer setups may swap it dynamically).
watch(
  () => props.length,
  (next) => {
    const old = cells.value;
    cells.value = Array.from({ length: next }, (_, i) => old[i] ?? '');
    syncCellsToModel();
  },
);

// ─── Input validation ─────────────────────────────────────────────

function isAcceptedChar(ch: string): boolean {
  if (ch.length !== 1) return false;
  let pass: boolean;
  switch (props.type) {
    case 'numeric':
      pass = /^[0-9]$/.test(ch);
      break;
    case 'alphanumeric':
      pass = /^[A-Za-z0-9]$/.test(ch);
      break;
    case 'text':
      pass = true;
      break;
  }
  if (!pass) return false;
  if (props.accept && !props.accept(ch)) return false;
  return true;
}

// Run the consumer `transform` hook. Returns the (possibly modified)
// character, or `''` if the transform dropped it (or returned anything
// not exactly one char long — multi-char transforms are out of scope
// for a per-cell pipeline).
function transformChar(ch: string): string {
  if (!props.transform) return ch;
  const t = props.transform(ch);
  return t.length === 1 ? t : '';
}

function sanitizeInput(raw: string, maxLength: number): string {
  let out = '';
  for (const ch of raw) {
    const transformed = transformChar(ch);
    if (transformed === '') continue;
    if (!isAcceptedChar(transformed)) continue;
    out += transformed;
    if (out.length >= maxLength) break;
  }
  return out;
}

// ─── Focus management ─────────────────────────────────────────────

function focusCell(index: number): void {
  const clamped = Math.max(0, Math.min(props.length - 1, index));
  const el = cellRefs.value?.[clamped];
  if (el) {
    el.focus();
    // Select the cell content so a typed char REPLACES the existing
    // one (the user expects typing in a filled cell to overwrite,
    // not to be rejected by maxlength).
    el.select();
  }
}

function onFocus(event: FocusEvent, index: number): void {
  focusedIndex.value = index;
  emit('focused', event);
}

function onBlur(event: FocusEvent, index: number): void {
  if (focusedIndex.value === index) focusedIndex.value = null;
  emit('blurred', event);
}

// ─── Input handlers ──────────────────────────────────────────────

function onInput(event: Event, index: number): void {
  if (props.disabled || props.readonly) return;
  const el = event.target as HTMLInputElement;
  const raw = el.value;
  // `maxlength=1` on the element means `raw` is 1 char in the happy
  // path. Mobile IMEs and autofill can deliver longer strings —
  // route those through paste-spread for the smart fill behaviour.
  if (raw.length > 1) {
    handleMultiCharInput(raw, index);
    return;
  }
  if (raw === '') {
    cells.value[index] = '';
    syncCellsToModel();
    return;
  }
  const transformed = transformChar(raw);
  if (transformed === '' || !isAcceptedChar(transformed)) {
    // Reject — reset the cell to its prior value.
    el.value = cells.value[index];
    return;
  }
  cells.value[index] = transformed;
  // If `transform` rewrote the char (e.g. 'a' → 'A'), make sure the
  // DOM element shows the transformed value immediately. The `:value`
  // binding will update on the next tick, but the user just typed —
  // any visible flicker between their keystroke and Vue's render would
  // feel wrong. Setting `el.value` here makes the swap synchronous.
  if (transformed !== raw) el.value = transformed;
  syncCellsToModel();
  // Auto-advance.
  if (index < props.length - 1) {
    focusCell(index + 1);
  }
  // Check complete.
  emitCompleteIfFull();
}

function handleMultiCharInput(raw: string, startIndex: number): void {
  const sanitized = sanitizeInput(raw, props.length - startIndex);
  if (sanitized.length === 0) {
    // No accepted chars — reset cell to prior value.
    const el = cellRefs.value?.[startIndex];
    if (el) el.value = cells.value[startIndex];
    return;
  }
  for (let i = 0; i < sanitized.length; i++) {
    cells.value[startIndex + i] = sanitized[i];
  }
  syncCellsToModel();
  const nextFocus = Math.min(
    props.length - 1,
    startIndex + sanitized.length,
  );
  focusCell(nextFocus);
  emitCompleteIfFull();
}

function onKeydown(event: KeyboardEvent, index: number): void {
  if (props.disabled || props.readonly) return;
  switch (event.key) {
    case 'Backspace':
      if (cells.value[index] === '') {
        // Empty cell: jump back + clear previous.
        if (index > 0) {
          event.preventDefault();
          cells.value[index - 1] = '';
          syncCellsToModel();
          focusCell(index - 1);
        }
      } else {
        // Filled cell: native backspace clears it (handled by browser
        // via maxlength=1 + the @input handler), no extra work.
      }
      break;
    case 'Delete':
      if (cells.value[index] !== '') {
        event.preventDefault();
        cells.value[index] = '';
        syncCellsToModel();
      }
      break;
    case 'ArrowLeft':
      event.preventDefault();
      if (index > 0) focusCell(index - 1);
      break;
    case 'ArrowRight':
      event.preventDefault();
      if (index < props.length - 1) focusCell(index + 1);
      break;
    case 'Home':
      event.preventDefault();
      focusCell(0);
      break;
    case 'End':
      event.preventDefault();
      focusCell(props.length - 1);
      break;
  }
}

function onPaste(event: ClipboardEvent, index: number): void {
  if (props.disabled || props.readonly) return;
  event.preventDefault();
  const clipboard = event.clipboardData?.getData('text') ?? '';
  handleMultiCharInput(clipboard, index);
}

function emitCompleteIfFull(): void {
  const all = cells.value.every((c) => c.length === 1);
  if (all) emit('complete', cells.value.join(''));
}

// ─── Auto-focus on mount ─────────────────────────────────────────

onMounted(() => {
  if (props.autoFocus && !props.disabled && !props.readonly) {
    focusCell(0);
  }
});

// ─── A11y label ──────────────────────────────────────────────────

const groupLabel = computed(() =>
  t('coar.otpInput.groupLabel', { length: props.length }, `Verification code, ${props.length} digits`),
);

const cellLabel = (i: number): string =>
  t(
    'coar.otpInput.cellLabel',
    { index: i + 1, length: props.length },
    `Digit ${i + 1} of ${props.length}`,
  );

const inputType = computed(() => (props.mask ? 'password' : 'text'));
const inputMode = computed(() =>
  props.type === 'numeric' ? 'numeric' : 'text',
);
const pattern = computed(() =>
  props.type === 'numeric' ? '[0-9]*' : undefined,
);
</script>

<template>
  <div
    class="coar-otp-input"
    :class="[
      `coar-otp-input--${size}`,
      {
        'coar-otp-input--disabled': disabled,
        'coar-otp-input--readonly': readonly,
        'coar-otp-input--error': hasError,
      },
    ]"
    role="group"
    :aria-label="groupLabel"
    :aria-describedby="describedBy"
  >
    <input
      v-for="(_, i) in cells"
      :id="i === 0 ? inputId : undefined"
      :key="i"
      ref="cellRefs"
      :value="cells[i]"
      :type="inputType"
      :inputmode="inputMode"
      :pattern="pattern"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :aria-label="cellLabel(i)"
      :aria-invalid="hasError || undefined"
      :autocomplete="i === 0 ? autocomplete : 'off'"
      :name="name ? `${name}-${i}` : undefined"
      class="coar-otp-input__cell"
      :class="{ 'coar-otp-input__cell--focused': focusedIndex === i }"
      maxlength="1"
      @input="onInput($event, i)"
      @keydown="onKeydown($event, i)"
      @paste="onPaste($event, i)"
      @focus="onFocus($event, i)"
      @blur="onBlur($event, i)"
    />
  </div>
</template>

<style scoped>
.coar-otp-input {
  display: inline-flex;
  align-items: center;
  gap: var(--coar-spacing-xs, 4px);
  /* The group is one tab-stop in spirit: Tab into the first cell,
     navigate inside with arrows / auto-advance, Tab out from any
     cell to leave the group. Browsers handle this automatically
     because each cell is a real <input>. */
}

.coar-otp-input__cell {
  /* Sizing matches `CoarTextInput` height tokens for visual rhythm
     consistency. Width is intentionally fixed (not flex) so the
     cells stay square-ish regardless of container width. */
  width: var(--coar-component-m-height);
  height: var(--coar-component-m-height);
  padding: 0;
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-input-radius);
  background: var(--coar-surface-input);
  color: var(--coar-text-neutral-primary);
  font-family: var(--coar-mono-base-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: var(--coar-component-m-font-size);
  font-variant-numeric: tabular-nums;
  text-align: center;
  box-sizing: border-box;
  transition:
    border-color var(--coar-duration-fast) var(--coar-ease-out),
    box-shadow var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-otp-input--xs .coar-otp-input__cell {
  width: var(--coar-component-xs-height);
  height: var(--coar-component-xs-height);
  font-size: var(--coar-component-xs-font-size);
}
.coar-otp-input--s .coar-otp-input__cell {
  width: var(--coar-component-s-height);
  height: var(--coar-component-s-height);
  font-size: var(--coar-component-s-font-size);
}
.coar-otp-input--l .coar-otp-input__cell {
  width: var(--coar-component-l-height);
  height: var(--coar-component-l-height);
  font-size: var(--coar-component-l-font-size);
}

.coar-otp-input__cell::placeholder {
  color: var(--coar-text-neutral-tertiary, #999);
}

.coar-otp-input__cell:hover:not(:disabled):not(:read-only) {
  border-color: var(--coar-border-input-hover);
}

.coar-otp-input__cell:focus,
.coar-otp-input__cell--focused {
  outline: none;
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
}

.coar-otp-input--error .coar-otp-input__cell {
  border-color: var(--coar-border-semantic-error-bold);
}

.coar-otp-input--error .coar-otp-input__cell:focus {
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
}

.coar-otp-input--disabled .coar-otp-input__cell {
  background: var(--coar-surface-input-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-otp-input--readonly .coar-otp-input__cell {
  cursor: default;
}
</style>
