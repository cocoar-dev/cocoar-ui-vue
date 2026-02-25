<script setup lang="ts">
import { computed, ref, toRef, onMounted, onBeforeUnmount, useTemplateRef, nextTick } from 'vue';
import { CoarIcon } from '../icon';
import { useSelectBase, type CoarSelectSize, type CoarSelectAppearance } from './useSelectBase';
import { useSelectDropdown } from './useSelectDropdown';
import { vScrollbar } from '../scrollbar/vScrollbar';
import type { CoarSelectOption } from './types';

export interface CoarTagSelectProps {
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Available options */
  options?: CoarSelectOption[];
  /** Select size */
  size?: CoarSelectSize;
  /** Visual appearance */
  appearance?: CoarSelectAppearance;
  /** Disables the select */
  disabled?: boolean;
  /** Makes the select read-only */
  readonly?: boolean;
  /** Marks as required */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Hint text */
  hint?: string;
  /** HTML id */
  id?: string;
  /** HTML name */
  name?: string;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Allow creating new tags by typing */
  allowCreate?: boolean;
  /** Comparison function */
  compareWith?: (a: unknown, b: unknown) => boolean;
  /** Dropdown position */
  dropdownPosition?: 'auto' | 'top' | 'bottom';
}

const props = withDefaults(defineProps<CoarTagSelectProps>(), {
  label: '',
  placeholder: 'Type to search...',
  options: () => [],
  size: 'm',
  appearance: 'outline',
  disabled: false,
  readonly: false,
  required: false,
  error: '',
  hint: '',
  id: '',
  name: '',
  searchPlaceholder: 'Type to search...',
  allowCreate: false,
  compareWith: undefined,
  dropdownPosition: 'auto',
});

const model = defineModel<unknown[]>({ default: () => [] });

const hostRef = useTemplateRef<HTMLElement>('hostRef');
const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const tagInputRef = useTemplateRef<HTMLInputElement>('tagInputRef');
const dropdownRef = useTemplateRef<HTMLElement>('dropdownRef');

const hasError = computed(() => props.error.length > 0);
const displayMessage = computed(() => props.error || props.hint);
const tagInputValue = ref('');

const compare = computed(() => props.compareWith ?? ((a: unknown, b: unknown) => a === b));

// Options minus already selected
const availableOptions = computed(() =>
  props.options.filter((o) => !model.value.some((v) => compare.value(v, o.value))),
);

const {
  isOpen,
  isFocused,
  searchQuery,
  highlightedIndex,
  inputId,
  messageId,
  listboxId,
  filteredOptions,
  activeDescendantId,
  openDropdown,
  closeDropdown,
  onKeyDown,
} = useSelectBase({
  options: availableOptions,
  searchable: computed(() => true),
  disabled: toRef(props, 'disabled'),
  readonly: toRef(props, 'readonly'),
  id: toRef(props, 'id'),
  dropdownPositionPreference: toRef(props, 'dropdownPosition'),
});

const { left: ddLeft, top: ddTop, minWidth: ddMinWidth } = useSelectDropdown({
  isOpen,
  triggerEl: triggerRef,
  dropdownEl: dropdownRef,
});

const selectedTags = computed(() =>
  model.value.map((v) => {
    const opt = props.options.find((o) => compare.value(o.value, v));
    return opt ?? { value: v, label: String(v) };
  }),
);

const hostClasses = computed(() => [
  'coar-tag-select-host',
  `coar-select--${props.size}`,
  {
    'coar-select--inline': props.appearance === 'inline',
    'coar-select--disabled': props.disabled,
    'coar-select--readonly': props.readonly,
    'coar-select--error': hasError.value,
    'coar-select--open': isOpen.value,
  },
]);

function removeTag(value: unknown, event?: Event) {
  event?.stopPropagation();
  if (props.disabled || props.readonly) return;
  model.value = model.value.filter((v) => !compare.value(v, value));
}

function selectOption(option: CoarSelectOption) {
  if (option.disabled || props.disabled || props.readonly) return;
  model.value = [...model.value, option.value];
  tagInputValue.value = '';
  searchQuery.value = '';
  nextTick(() => tagInputRef.value?.focus());
}

function selectHighlighted() {
  const options = filteredOptions.value;
  const idx = highlightedIndex.value;
  if (idx >= 0 && idx < options.length && !options[idx].disabled) {
    selectOption(options[idx]);
  }
}

function onTagInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  tagInputValue.value = value;
  searchQuery.value = value;
  if (value && !isOpen.value) {
    openDropdown(triggerRef.value ?? undefined);
  }
}

function onTagKeyDown(event: KeyboardEvent) {
  // Backspace removes last tag when input is empty
  if (event.key === 'Backspace' && !tagInputValue.value && model.value.length > 0) {
    model.value = model.value.slice(0, -1);
    return;
  }

  // Enter creates new tag if allowCreate and no highlighted option
  if (event.key === 'Enter' && props.allowCreate && tagInputValue.value.trim()) {
    const query = tagInputValue.value.trim();
    const match = filteredOptions.value.find((o) => o.label.toLowerCase() === query.toLowerCase());
    if (highlightedIndex.value >= 0) {
      selectHighlighted();
    } else if (match) {
      selectOption(match);
    } else {
      // Create new tag
      model.value = [...model.value, query];
      tagInputValue.value = '';
      searchQuery.value = '';
    }
    event.preventDefault();
    return;
  }

  onKeyDown(event, selectHighlighted, triggerRef.value ?? undefined);
}

function onTriggerClick() {
  if (props.disabled || props.readonly) return;
  tagInputRef.value?.focus();
  if (!isOpen.value && availableOptions.value.length > 0) {
    openDropdown(triggerRef.value ?? undefined);
  }
}

function onInputFocus() {
  isFocused.value = true;
  if (availableOptions.value.length > 0) {
    openDropdown(triggerRef.value ?? undefined);
  }
}

function onInputBlur() {
  isFocused.value = false;
}

function onDocumentMouseDown(event: MouseEvent) {
  if (!isOpen.value) return;
  const target = event.target as Node;
  if (hostRef.value?.contains(target)) return;
  if (dropdownRef.value?.contains(target)) return;
  closeDropdown();
}

onMounted(() => document.addEventListener('mousedown', onDocumentMouseDown));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMouseDown));
</script>

<template>
  <div ref="hostRef" :class="hostClasses">
    <div class="coar-select-wrapper">
      <!-- Label -->
      <label v-if="label" :for="inputId" class="coar-select-label">
        {{ label }}
        <span v-if="required" class="coar-select-required">*</span>
      </label>

      <!-- Trigger with Tags -->
      <div
        ref="triggerRef"
        class="coar-tag-select-trigger"
        :class="{
          'coar-tag-select-trigger--focused': isFocused,
          'coar-tag-select-trigger--disabled': disabled,
          'coar-tag-select-trigger--readonly': readonly,
          'coar-tag-select-trigger--error': hasError,
        }"
        @click="onTriggerClick"
      >
        <div class="coar-tag-select-tags">
          <span
            v-for="tag in selectedTags"
            :key="String(tag.value)"
            class="coar-tag-select-tag"
          >
            <span class="coar-tag-select-tag-label">{{ tag.label }}</span>
            <button
              v-if="!disabled && !readonly"
              type="button"
              class="coar-tag-select-tag-remove"
              tabindex="-1"
              aria-label="Remove"
              @click="removeTag(tag.value, $event)"
            >
              <CoarIcon name="x" source="coar-builtin" size="auto" />
            </button>
          </span>
          <input
            :id="inputId"
            ref="tagInputRef"
            type="text"
            class="coar-tag-select-input"
            :placeholder="selectedTags.length === 0 ? placeholder : ''"
            :disabled="disabled"
            :readonly="readonly"
            :value="tagInputValue"
            :aria-expanded="isOpen"
            aria-haspopup="listbox"
            :aria-controls="listboxId"
            :aria-activedescendant="activeDescendantId"
            :aria-describedby="displayMessage ? messageId : undefined"
            :aria-invalid="hasError ? 'true' : undefined"
            role="combobox"
            autocomplete="off"
            @input="onTagInput"
            @keydown="onTagKeyDown"
            @focus="onInputFocus"
            @blur="onInputBlur"
          />
        </div>
      </div>

      <!-- Dropdown (teleported to body for proper stacking) -->
      <Teleport to="body">
        <div
          v-if="isOpen && filteredOptions.length > 0"
          ref="dropdownRef"
          :class="['coar-select-dropdown', `coar-select-dropdown--${props.size}`]"
          role="presentation"
          :style="{
            position: 'fixed',
            top: '0px',
            left: '0px',
            transform: `translate3d(${ddLeft}px, ${ddTop}px, 0)`,
            minWidth: `${ddMinWidth}px`,
            zIndex: 'var(--coar-z-overlay, 1000)',
          }"
        >
          <div
            :id="listboxId"
            v-scrollbar="{ overflowX: 'hidden', defer: false }"
            class="coar-select-options"
            role="listbox"
            :aria-label="label || 'Options'"
          >
            <div
              v-for="(option, i) in filteredOptions"
              :id="`${inputId}-option-${i}`"
              :key="String(option.value)"
              class="coar-select-option"
              :class="{
                'coar-select-option--highlighted': highlightedIndex === i,
                'coar-select-option--disabled': option.disabled,
              }"
              :aria-disabled="option.disabled ? 'true' : undefined"
              tabindex="-1"
              role="option"
              @click="selectOption(option)"
              @mouseenter="highlightedIndex = i"
            >
              <CoarIcon v-if="option.icon" :name="option.icon" size="s" class="coar-select-option-icon" />
              <span class="coar-select-option-label">{{ option.label }}</span>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Message -->
      <div
        :id="messageId"
        class="coar-form-field-message"
        :class="{ 'coar-form-field-message--error': hasError }"
        :title="displayMessage || undefined"
      >
        {{ displayMessage }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-tag-select-host {
  display: block;
  position: relative;
}

.coar-select-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Label */
.coar-select-label {
  display: block;
  margin-bottom: var(--coar-component-m-label-margin);
  font-family: var(--coar-body-small-bold-family);
  font-size: var(--coar-component-m-label-font-size);
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  user-select: none;
}

.coar-select-required {
  color: var(--coar-text-semantic-error-bold);
  margin-left: var(--coar-spacing-xs);
}

.coar-select--xs .coar-select-label {
  font-size: var(--coar-component-xs-label-font-size);
  margin-bottom: var(--coar-component-xs-label-margin);
}
.coar-select--s .coar-select-label {
  font-size: var(--coar-component-s-label-font-size);
  margin-bottom: var(--coar-component-s-label-margin);
}
.coar-select--l .coar-select-label {
  font-size: var(--coar-component-l-label-font-size);
  margin-bottom: var(--coar-component-l-label-margin);
}

/* Tag Trigger */
.coar-tag-select-trigger {
  display: flex;
  align-items: center;
  min-height: var(--coar-component-m-height);
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-surface-input);
  cursor: text;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.coar-select--xs .coar-tag-select-trigger { min-height: var(--coar-component-xs-height); }
.coar-select--s .coar-tag-select-trigger { min-height: var(--coar-component-s-height); }
.coar-select--l .coar-tag-select-trigger { min-height: var(--coar-component-l-height); }

.coar-tag-select-trigger:hover:not(.coar-tag-select-trigger--disabled):not(.coar-tag-select-trigger--readonly):not(.coar-tag-select-trigger--error):not(.coar-tag-select-trigger--focused) {
  border-color: var(--coar-border-input-hover);
}

.coar-tag-select-trigger--focused:not(.coar-tag-select-trigger--error) {
  border-color: var(--coar-border-accent-primary);
  box-shadow: inset 0 0 0 1px var(--coar-border-accent-primary);
}

.coar-tag-select-trigger--disabled {
  background: var(--coar-surface-input-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-tag-select-trigger--readonly { cursor: default; }

.coar-tag-select-trigger--error { border-color: var(--coar-border-semantic-error-bold); }

.coar-tag-select-trigger--error.coar-tag-select-trigger--focused {
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
}

.coar-select--inline .coar-tag-select-trigger {
  border: none;
  background: transparent;
  box-shadow: none;
}

/* Tags Container */
.coar-tag-select-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--coar-spacing-xs);
  align-items: center;
  flex: 1;
  min-width: 0;
}

/* Tag */
.coar-tag-select-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 24px;
  padding: 0 var(--coar-spacing-xs) 0 var(--coar-spacing-s);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-background-neutral-secondary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-small-bold-weight);
  white-space: nowrap;
  max-width: 160px;
}

.coar-tag-select-tag-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.coar-tag-select-tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  border-radius: 2px;
  opacity: 0.6;
  transition: opacity 0.1s ease;
}

.coar-tag-select-tag-remove:hover { opacity: 1; }

/* Input */
.coar-tag-select-input {
  flex: 1;
  min-width: 60px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-primary);
  outline: none;
}

.coar-tag-select-input::placeholder { color: var(--coar-text-neutral-tertiary); }

/* Dropdown */
.coar-select-dropdown {
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  box-shadow: var(--coar-shadow-m);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Options */
.coar-select-options {
  max-height: 240px;
  overflow: hidden;
  padding: var(--coar-spacing-xs) 0;
}

.coar-select-option {
  display: flex;
  align-items: center;
  gap: var(--coar-select-option-gap, var(--coar-spacing-xs));
  padding: var(--coar-select-option-padding, var(--coar-spacing-s) var(--coar-spacing-m));
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-select-option-font-size, var(--coar-body-small-base-size));
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.coar-select-option:hover:not(.coar-select-option--disabled),
.coar-select-option--highlighted:not(.coar-select-option--disabled) {
  background: var(--coar-background-neutral-tertiary);
}

.coar-select-option--disabled { color: var(--coar-text-neutral-disabled); cursor: not-allowed; }
.coar-select-option-icon { flex-shrink: 0; color: inherit; }
.coar-select-option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Message */
.coar-form-field-message {
  display: block;
  margin-top: var(--coar-spacing-xs);
  height: calc(var(--coar-body-caption-size) * 1.4);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-caption-weight);
  line-height: 1.4;
  color: var(--coar-text-neutral-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coar-form-field-message:empty { visibility: hidden; }
.coar-form-field-message--error { color: var(--coar-text-semantic-error-bold); }

@media (prefers-reduced-motion: reduce) {
  .coar-tag-select-trigger,
  .coar-tag-select-tag-remove,
  .coar-select-option {
    transition: none;
  }
}
</style>
