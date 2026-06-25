<script setup lang="ts">
import { computed, inject, useTemplateRef, useSlots } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon } from '../icon';
import CoarInputFrame from '../input-frame/CoarInputFrame.vue';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';

export type CoarTextInputSize = 'xs' | 's' | 'm' | 'l';

export interface CoarTextInputProps {
  /** Placeholder text shown when input is empty */
  placeholder?: string;
  /** Input size */
  size?: CoarTextInputSize;
  /** Number of visible text rows (1 = single-line, 2+ = textarea) */
  rows?: number;
  /** Disables the input */
  disabled?: boolean;
  /** Makes the input read-only */
  readonly?: boolean;
  /** Marks the input as required */
  required?: boolean;
  /** Error state (boolean for standalone use; auto-injected from CoarFormField) */
  error?: boolean;
  /** Show clear button when input has value */
  clearable?: boolean;
  /** Text displayed before the input value */
  prefix?: string;
  /** Text displayed after the input value */
  suffix?: string;
  /** HTML id attribute */
  id?: string;
  /** HTML name attribute */
  name?: string;
  /** HTML autocomplete attribute */
  autocomplete?: string;
  /** Maximum character length */
  maxlength?: number;
}

const props = withDefaults(defineProps<CoarTextInputProps>(), {
  placeholder: '',
  size: 'm',
  rows: 1,
  disabled: false,
  readonly: false,
  required: false,
  error: false,
  clearable: false,
  prefix: '',
  suffix: '',
  id: '',
  name: '',
  autocomplete: '',
  maxlength: undefined,
});

const { t } = useI18n();
const slots = useSlots();

const model = defineModel<string>({ default: '' });

const emit = defineEmits<{
  focused: [event: FocusEvent];
  blurred: [event: FocusEvent];
  clear: [];
}>();

const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

const inputElement = useTemplateRef<HTMLInputElement | HTMLTextAreaElement>('inputElement');

const autoId = `coar-text-input-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || formField?.inputId.value || autoId);

const isMultiline = computed(() => props.rows > 1);
const hasError = computed(() => props.error || (formField?.hasError.value ?? false));
const describedBy = computed(() => formField?.messageId.value || undefined);

const showClearButton = computed(() =>
  props.clearable && model.value.length > 0 && !props.disabled && !props.readonly
);

// The clear button keeps its layout slot whenever clearing is possible, and is
// only visually hidden while empty — so the field doesn't resize on first
// keystroke when the button would otherwise appear.
const clearSlotActive = computed(() =>
  props.clearable && !props.disabled && !props.readonly
);

// Frame slot presence — only provide #leading / #trailing when there's real
// content, so CoarInputFrame's has-leading / has-trailing padding logic is right.
const hasPrefix = computed(() => !!props.prefix || !!slots.prefix);
const hasTrailing = computed(
  () => !!props.suffix || !!slots.suffix || clearSlotActive.value || !!slots.suffixAction,
);

const hostClasses = computed(() => [
  'coar-text-input-host',
  `coar-text-input--${props.size}`,
  { 'coar-text-input--multiline': isMultiline.value },
]);

function onInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  model.value = target.value;
}

function onFocus(event: FocusEvent) {
  emit('focused', event);
}

function onBlur(event: FocusEvent) {
  emit('blurred', event);
}

function onClear() {
  model.value = '';
  emit('clear');
  inputElement.value?.focus();
}
</script>

<template>
  <div :class="hostClasses">
    <div class="coar-text-input-wrapper">
      <!-- Single-line: the shared input shell owns box / radius / padding / states -->
      <CoarInputFrame
        v-if="!isMultiline"
        class="coar-text-input-frame"
        :size="size"
        :error="hasError"
        :disabled="disabled"
        :readonly="readonly"
      >
        <!-- Prefix → leading affix -->
        <template v-if="hasPrefix" #leading>
          <span class="coar-text-input-prefix">
            <template v-if="prefix">{{ prefix }}</template>
            <slot name="prefix" />
          </span>
        </template>

        <!-- Input Element -->
        <input
          :id="inputId"
          ref="inputElement"
          :name="name"
          type="text"
          :value="model"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :autocomplete="autocomplete || undefined"
          :maxlength="maxlength"
          :aria-describedby="describedBy"
          :aria-invalid="hasError ? 'true' : undefined"
          class="coar-text-input-field"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
        />

        <!-- Suffix + clear + suffix-actions → trailing affix -->
        <template v-if="hasTrailing" #trailing>
          <span v-if="suffix || $slots.suffix" class="coar-text-input-suffix">
            <template v-if="suffix">{{ suffix }}</template>
            <slot name="suffix" />
          </span>

          <button
            v-if="clearSlotActive"
            type="button"
            class="coar-text-input-clear"
            :class="{ 'coar-text-input-clear--hidden': !showClearButton }"
            tabindex="-1"
            :aria-hidden="!showClearButton || undefined"
            :aria-label="t('coar.ui.textInput.clear', undefined, 'Clear')"
            @click="onClear"
          >
            <CoarIcon name="x" source="coar-builtin" size="auto" />
          </button>

          <span v-if="$slots.suffixAction" class="coar-text-input-suffix-actions">
            <slot name="suffixAction" />
          </span>
        </template>
      </CoarInputFrame>

      <!-- Multiline: the same shell in auto-height mode (min-height floor, the box
           grows with the rows, radius capped at the single-row pill). -->
      <CoarInputFrame
        v-else
        multiline
        class="coar-text-input-frame"
        :size="size"
        :error="hasError"
        :disabled="disabled"
        :readonly="readonly"
      >
        <textarea
          :id="inputId"
          ref="inputElement"
          :name="name"
          :value="model"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :maxlength="maxlength"
          :aria-describedby="describedBy"
          :aria-invalid="hasError ? 'true' : undefined"
          :rows="rows"
          class="coar-text-input-field coar-text-input-textarea"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
        />

        <!-- Clear → trailing affix (top-aligned in multiline by the frame). -->
        <template v-if="clearSlotActive" #trailing>
          <button
            type="button"
            class="coar-text-input-clear"
            :class="{ 'coar-text-input-clear--hidden': !showClearButton }"
            tabindex="-1"
            :aria-hidden="!showClearButton || undefined"
            :aria-label="t('coar.ui.textInput.clear', undefined, 'Clear')"
            @click="onClear"
          >
            <CoarIcon name="x" source="coar-builtin" size="auto" />
          </button>
        </template>
      </CoarInputFrame>
    </div>
  </div>
</template>

<style scoped>
.coar-text-input-host {
  display: block;
}

/* Container */
.coar-text-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Box / radius / surface / states / size + field-pad are owned by CoarInputFrame
   for BOTH branches now (single-line and the multiline textarea via its multiline
   mode). Only field-level typography + the textarea/clear specifics live here. */

/* Size-specific typography */
.coar-text-input--xs .coar-text-input-field { font-size: var(--coar-component-xs-font-size); }
.coar-text-input--s .coar-text-input-field { font-size: var(--coar-component-s-font-size); }
.coar-text-input--l .coar-text-input-field { font-size: var(--coar-component-l-font-size); }

/* Input Field — horizontal padding is owned by CoarInputFrame (single-line) or
   by the textarea rule below (multiline); the field itself stays flush. */
.coar-text-input-field {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
}

/* Textarea specific. Horizontal + vertical insets come from the frame's field
   padding (multiline mode); the textarea sizes itself by rows and may be dragged
   taller (resize), which grows the frame past its single-row min-height floor. */
.coar-text-input-textarea {
  height: auto;
  resize: vertical;
  min-height: calc(var(--coar-component-m-height) + var(--coar-component-m-height));
}

.coar-text-input--xs .coar-text-input-textarea {
  min-height: calc(var(--coar-component-xs-height) + var(--coar-component-xs-height));
}

.coar-text-input--s .coar-text-input-textarea {
  min-height: calc(var(--coar-component-s-height) + var(--coar-component-s-height));
}

.coar-text-input--l .coar-text-input-textarea {
  min-height: calc(var(--coar-component-l-height) + var(--coar-component-l-height));
}

.coar-text-input-field::placeholder {
  color: var(--coar-text-placeholder);
}

.coar-text-input-field:disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
}

.coar-text-input-field:read-only {
  cursor: default;
}

/* Prefix / Suffix — outer field-pad is owned by the frame's leading/trailing
   affix wrappers; these just lay out the text/icon content. */
.coar-text-input-prefix {
  display: inline-flex;
  align-items: center;
  color: var(--coar-icon-neutral-secondary);
  font-size: var(--coar-body-small-base-size);
  white-space: nowrap;
  flex-shrink: 0;
}

.coar-text-input-suffix {
  display: inline-flex;
  align-items: center;
  color: var(--coar-icon-neutral-secondary);
  font-size: var(--coar-body-small-base-size);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Suffix Actions */
.coar-text-input-suffix-actions {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  flex-shrink: 0;
}

/* Clear Button */
.coar-text-input-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-disabled);
  font-size: var(--coar-body-small-base-size);
  cursor: pointer;
  transition:
    color var(--coar-duration-fast) var(--coar-ease-out),
    opacity var(--coar-duration-fast) var(--coar-ease-out);
  flex-shrink: 0;
  opacity: 0.4;
}

/* Empty state — keep the slot (no resize on first keystroke), just hide it. */
.coar-text-input-clear--hidden {
  visibility: hidden;
  pointer-events: none;
}

/* Reveal the clear button on field hover / focus. Both branches now render
   CoarInputFrame (class fallthrough puts this component's scope on the frame root),
   so :hover / :focus-within reach the clear for single-line AND multiline. */
.coar-text-input-frame:hover .coar-text-input-clear,
.coar-text-input-frame:focus-within .coar-text-input-clear {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-text-input--xs .coar-text-input-clear { font-size: var(--coar-component-xs-font-size); }
.coar-text-input--s .coar-text-input-clear { font-size: var(--coar-component-s-font-size); }
.coar-text-input--l .coar-text-input-clear { font-size: var(--coar-component-l-font-size); }

.coar-text-input-clear:hover {
  color: var(--coar-icon-neutral-primary);
}

.coar-text-input-clear:focus { outline: none; }
.coar-text-input-clear:focus-visible { color: var(--coar-icon-neutral-primary); }

/* Browser autofill styling */
.coar-text-input-field:-webkit-autofill,
.coar-text-input-field:-webkit-autofill:hover,
.coar-text-input-field:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--coar-text-neutral-primary);
  -webkit-box-shadow: 0 0 0px 1000px var(--coar-surface-input) inset;
  transition: background-color 5000s ease-in-out 0s;
}

/* Message styles are in shared/form-field-message.css */
</style>
