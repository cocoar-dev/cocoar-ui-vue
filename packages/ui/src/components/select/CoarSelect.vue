<script setup lang="ts" generic="T">
/**
 * Single-select combobox. The trigger lives in this component's template; the dropdown
 * is rendered by the overlay-service (see `CoarSelectDropdownPanel`). Delegating to the
 * service gives us:
 *
 *  - tree-aware outside-click (a click inside an ancestor dialog closes the dropdown but
 *    keeps the dialog open, via `useOverlayParent()`)
 *  - correct z-index stacking inside any overlay (no more dropdown-behind-dialog)
 *  - anchor-width sizing via `size.minWidth: 'anchor'` — the dropdown matches the
 *    trigger width while long option labels can extend it
 *  - reposition on scroll (`scroll.strategy: 'reposition'`), no transform-translate3d
 *    trap that used to make fixed-positioned descendants render relative to the dropdown
 *    instead of the viewport
 */
import {
  computed, inject, toRef, watch, onBeforeUnmount, useTemplateRef, nextTick, markRaw,
} from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon } from '../icon';
import { useSelectBase, type CoarSelectSize, type CoarSelectAppearance } from './useSelectBase';
import { getOverlayService, useOverlayParent } from '../overlay/useOverlay';
import { selectPreset } from '../overlay/overlay-presets';
import type { OverlayRef } from '../overlay/overlay-types';
import type { CoarSelectOption, CoarSelectSortGroups, CoarSelectSortOptions } from './types';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';
import CoarSelectDropdownPanel from './CoarSelectDropdownPanel.vue';

export interface CoarSelectProps<T = unknown> {
  /** Placeholder text */
  placeholder?: string;
  /** Available options */
  options?: CoarSelectOption<T>[];
  /** Select size */
  size?: CoarSelectSize;
  /** Visual appearance */
  appearance?: CoarSelectAppearance;
  /** Disables the select */
  disabled?: boolean;
  /** Makes the select read-only */
  readonly?: boolean;
  /** Whether the select has an error */
  error?: boolean;
  /** HTML id */
  id?: string;
  /** HTML name */
  name?: string;
  /** Enable search/filter */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Show clear button */
  clearable?: boolean;
  /** Comparison function for matching values */
  compareWith?: (a: T, b: T) => boolean;
  /** Dropdown position preference */
  dropdownPosition?: 'auto' | 'top' | 'bottom';
  /** Sort order for groups. Default: 'asc' */
  sortGroups?: CoarSelectSortGroups;
  /** Sort order for options (within each group, or all if ungrouped). Default: 'none' */
  sortOptions?: CoarSelectSortOptions<T>;
}

const props = withDefaults(defineProps<CoarSelectProps<T>>(), {
  placeholder: 'Select an option...',
  options: () => [],
  size: 'm',
  appearance: 'outline',
  disabled: false,
  readonly: false,
  error: false,
  id: '',
  name: '',
  searchable: false,
  searchPlaceholder: 'Search...',
  clearable: false,
  compareWith: undefined,
  dropdownPosition: 'auto',
  sortGroups: 'asc',
  sortOptions: 'none',
});

const model = defineModel<T | null>({ default: null });

const { t } = useI18n();

const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

const hostRef = useTemplateRef<HTMLElement>('hostRef');
const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const searchInputRef = useTemplateRef<HTMLInputElement>('searchInputRef');

const hasError = computed(() => props.error || (formField?.hasError.value ?? false));

const {
  isOpen,
  isFocused,
  searchQuery,
  highlightedIndex,
  inputId: baseInputId,
  listboxId,
  filteredOptions,
  activeDescendantId,
  closeDropdown,
  toggleDropdown,
  onSearchInput,
  onFocus,
  onBlur,
  onKeyDown,
} = useSelectBase({
  options: toRef(props, 'options'),
  searchable: toRef(props, 'searchable'),
  disabled: toRef(props, 'disabled'),
  readonly: toRef(props, 'readonly'),
  id: toRef(props, 'id'),
  dropdownPositionPreference: toRef(props, 'dropdownPosition'),
  sortGroups: toRef(props, 'sortGroups'),
  sortOptions: toRef(props, 'sortOptions'),
});

const inputId = computed(() => props.id || formField?.inputId.value || baseInputId.value);
const describedBy = computed(() => formField?.messageId.value || undefined);

const compare = computed(() => props.compareWith ?? ((a: T, b: T) => a === b));

const selectedOption = computed(() => {
  if (model.value === null || model.value === undefined) return null;
  return props.options.find((o) => compare.value(o.value, model.value as T)) ?? null;
});

const showClearButton = computed(() =>
  props.clearable && model.value !== null && !props.disabled && !props.readonly,
);

const hostClasses = computed(() => [
  'coar-select-host',
  `coar-select--${props.size}`,
  {
    'coar-select--inline': props.appearance === 'inline',
    'coar-select--disabled': props.disabled,
    'coar-select--readonly': props.readonly,
    'coar-select--error': hasError.value,
    'coar-select--open': isOpen.value,
  },
]);

function isSelected(option: CoarSelectOption<T>): boolean {
  if (model.value === null || model.value === undefined) return false;
  return compare.value(model.value as T, option.value);
}

function selectOption(option: CoarSelectOption<T>) {
  if (option.disabled || props.disabled || props.readonly) return;
  model.value = option.value;
  closeDropdown();
  nextTick(() => triggerRef.value?.focus());
}

function selectHighlighted() {
  const options = filteredOptions.value;
  const idx = highlightedIndex.value;
  if (idx >= 0 && idx < options.length && !options[idx].disabled) {
    selectOption(options[idx]);
  }
}

function clearSelection(event: Event) {
  event.stopPropagation();
  model.value = null;
}

function onTriggerClick(event: Event) {
  event.stopPropagation();
  toggleDropdown(triggerRef.value ?? undefined);
  if (isOpen.value && props.searchable) {
    nextTick(() => searchInputRef.value?.focus());
  }
}

function handleKeyDown(event: KeyboardEvent) {
  const wasOpen = isOpen.value;
  const isSearchFocused = searchInputRef.value != null && event.target === searchInputRef.value;
  onKeyDown(event, selectHighlighted, triggerRef.value ?? undefined, isSearchFocused);
  if (isOpen.value && props.searchable && event.key !== 'Escape' && event.key !== 'Tab') {
    nextTick(() => searchInputRef.value?.focus());
  }
  if (wasOpen && !isOpen.value && event.key === 'Escape') {
    nextTick(() => triggerRef.value?.focus());
  }
}

function handleBlur(event: FocusEvent) {
  const related = event.relatedTarget as Node | null;
  if (related && hostRef.value?.contains(related)) return;
  onBlur();
}

// --- overlay-service wiring ---

const parentOverlay = useOverlayParent();
let overlayRef: OverlayRef | null = null;

function openOverlay() {
  const trigger = triggerRef.value;
  if (!trigger || overlayRef) return;

  const ref = getOverlayService().open({
    spec: {
      ...selectPreset,
      anchor: { kind: 'element', element: trigger },
    },
    content: { kind: 'component', component: markRaw(CoarSelectDropdownPanel) },
    inputs: {
      filteredOptions,
      highlightedIndex,
      searchQuery,
      listboxId: listboxId.value,
      optionIdPrefix: inputId.value,
      size: props.size,
      isSelected,
      onOptionClick: (opt: CoarSelectOption<T>) => selectOption(opt),
      onHighlight: (i: number) => { highlightedIndex.value = i; },
    },
    parent: parentOverlay,
  });
  overlayRef = ref;

  // Sync local state if the service closes the overlay externally (outside click,
  // escape, scroll-close). `closeDropdown()` sets `isOpen=false` which the watcher
  // below sees and no-ops since `overlayRef` is already cleared here.
  ref.afterClosed.then(() => {
    if (overlayRef !== ref) return;
    overlayRef = null;
    if (isOpen.value) closeDropdown();
  });
}

function closeOverlay() {
  const ref = overlayRef;
  overlayRef = null;
  if (ref && !ref.isClosed) ref.close();
}

watch(isOpen, (open) => {
  if (open) openOverlay();
  else closeOverlay();
});

onBeforeUnmount(() => {
  closeOverlay();
});
</script>

<template>
  <div ref="hostRef" :class="hostClasses">
    <div class="coar-select-wrapper">
      <!-- Trigger -->
      <div
        :id="inputId"
        ref="triggerRef"
        class="coar-select-trigger"
        :class="{
          'coar-select-trigger--focused': isFocused,
          'coar-select-trigger--disabled': disabled,
          'coar-select-trigger--readonly': readonly,
          'coar-select-trigger--error': hasError,
          'coar-select-trigger--open': isOpen,
        }"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        :aria-controls="listboxId"
        :aria-activedescendant="activeDescendantId"
        :aria-describedby="describedBy"
        :aria-invalid="hasError ? 'true' : undefined"
        :aria-disabled="disabled ? 'true' : undefined"
        :tabindex="disabled ? -1 : 0"
        role="combobox"
        @click="onTriggerClick"
        @keydown="handleKeyDown"
        @focus="onFocus"
        @blur="handleBlur"
      >
        <!-- Inline search (shown when open + searchable) -->
        <input
          v-if="isOpen && searchable"
          ref="searchInputRef"
          type="text"
          class="coar-select-inline-search"
          :placeholder="selectedOption?.label || placeholder"
          :value="searchQuery"
          autocomplete="off"
          @input="onSearchInput"
          @keydown="handleKeyDown"
          @click.stop
        />
        <!-- Selected Value or Placeholder -->
        <span v-else class="coar-select-value" :class="{ 'coar-select-placeholder': !selectedOption }">
          <template v-if="selectedOption">
            <CoarIcon v-if="selectedOption.icon" :name="selectedOption.icon" size="s" class="coar-select-value-icon" />
            {{ selectedOption.label }}
          </template>
          <template v-else>{{ placeholder }}</template>
        </span>

        <!-- Actions -->
        <span class="coar-select-actions">
          <button
            v-if="showClearButton"
            type="button"
            class="coar-select-clear"
            tabindex="-1"
            :aria-label="t('coar.ui.select.clearSelection', undefined, 'Clear selection')"
            @click="clearSelection"
          >
            <CoarIcon name="x" source="coar-builtin" size="auto" />
          </button>
          <CoarIcon
            name="chevron-right"
            source="coar-builtin"
            size="auto"
            class="coar-select-arrow"
            :class="{ 'coar-select-arrow--open': isOpen }"
          />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-select-host {
  display: block;
  position: relative;
}

.coar-select-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Trigger */
.coar-select-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--coar-component-m-height);
  padding: 0 var(--coar-spacing-s);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-surface-input);
  cursor: pointer;
  transition: border-color var(--coar-duration-fast) var(--coar-ease-out), box-shadow var(--coar-duration-fast) var(--coar-ease-out);
  outline: none;
}

.coar-select--xs .coar-select-trigger { height: var(--coar-component-xs-height); }
.coar-select--s .coar-select-trigger { height: var(--coar-component-s-height); }
.coar-select--l .coar-select-trigger { height: var(--coar-component-l-height); }

.coar-select-trigger:hover:not(.coar-select-trigger--disabled):not(.coar-select-trigger--readonly):not(.coar-select-trigger--error):not(.coar-select-trigger--focused) {
  border-color: var(--coar-border-input-hover);
}

.coar-select-trigger--focused:not(.coar-select-trigger--error),
.coar-select-trigger--open:not(.coar-select-trigger--error) {
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
}

.coar-select-trigger--disabled {
  background: var(--coar-surface-input-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-select-trigger--readonly {
  cursor: default;
}

.coar-select-trigger--error {
  border-color: var(--coar-border-semantic-error-bold);
}

.coar-select-trigger--error.coar-select-trigger--focused {
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
}

/* Inline appearance */
.coar-select--inline .coar-select-trigger {
  border: none;
  background: transparent;
  box-shadow: none;
}

.coar-select--inline .coar-select-trigger:hover:not(.coar-select-trigger--disabled):not(.coar-select-trigger--readonly) {
  background: var(--coar-background-neutral-tertiary);
}

.coar-select--inline .coar-select-trigger--focused:not(.coar-select-trigger--error),
.coar-select--inline .coar-select-trigger--open {
  background: var(--coar-background-neutral-tertiary);
  box-shadow: none;
}

/* Value */
.coar-select-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  min-width: 0;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-select-placeholder { color: var(--coar-text-placeholder); }

.coar-select--xs .coar-select-value { font-size: var(--coar-component-xs-font-size); }
.coar-select--s .coar-select-value { font-size: var(--coar-component-s-font-size); }
.coar-select--l .coar-select-value { font-size: var(--coar-component-l-font-size); }

/* Actions */
.coar-select-actions {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  margin-left: var(--coar-spacing-xs);
  flex-shrink: 0;
}

/* Clear */
.coar-select-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-disabled);
  cursor: pointer;
  border-radius: var(--coar-radius-xs);
  transition: color var(--coar-duration-fast) var(--coar-ease-out), opacity var(--coar-duration-fast) var(--coar-ease-out);
  opacity: 0.4;
}

.coar-select-trigger:hover .coar-select-clear,
.coar-select--open .coar-select-clear {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-select-clear:hover {
  opacity: 1;
  color: var(--coar-icon-neutral-primary);
}

/* Arrow */
.coar-select-arrow {
  width: 16px;
  height: 16px;
  color: var(--coar-icon-neutral-secondary);
  transform: rotate(90deg);
  transition: transform var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-select-arrow--open {
  transform: rotate(-90deg);
}

/* Inline search */
.coar-select-inline-search {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  outline: none;
}

.coar-select-inline-search::placeholder {
  color: var(--coar-text-placeholder);
}

.coar-select--xs .coar-select-inline-search { font-size: var(--coar-component-xs-font-size); }
.coar-select--s .coar-select-inline-search { font-size: var(--coar-component-s-font-size); }
.coar-select--l .coar-select-inline-search { font-size: var(--coar-component-l-font-size); }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .coar-select-trigger,
  .coar-select-clear,
  .coar-select-arrow {
    transition: none;
  }
}
</style>
