<script setup lang="ts" generic="T">
/**
 * Multi-select combobox. See `CoarSelect.vue` for the service-routing rationale — this
 * component differs only in selection semantics (array model, per-option checkbox,
 * optional "Select all" row), but the overlay wiring (anchor, preset, parent lookup,
 * open/close lifecycle) is identical.
 */
import {
  computed, inject, toRef, watch, onBeforeUnmount, useTemplateRef, nextTick, markRaw,
} from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon } from '../icon';
import { useSelectBase, resolveDropdownSize, type CoarSelectSize, type CoarSelectAppearance } from './useSelectBase';
import { getOverlayService, useOverlayParent } from '../overlay/useOverlay';
import { selectPreset } from '../overlay/overlay-presets';
import type { OverlayRef } from '../overlay/overlay-types';
import { vTooltip } from '../tooltip/vTooltip';
import type { CoarSelectOption, CoarSelectSortGroups, CoarSelectSortOptions } from './types';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';
import CoarMultiSelectDropdownPanel from './CoarMultiSelectDropdownPanel.vue';

export interface CoarMultiSelectProps<T = unknown> {
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
  /** Show "Select All" checkbox */
  showSelectAll?: boolean;
  /** Label for "Select All" */
  selectAllLabel?: string;
  /** Comparison function */
  compareWith?: (a: T, b: T) => boolean;
  /** Dropdown position */
  dropdownPosition?: 'auto' | 'top' | 'bottom';
  /**
   * Max width of the dropdown panel. Omitted (default) → fixed to the trigger
   * width with ellipsis + tooltip for long labels. Set a number (px) or CSS
   * length → the panel may grow from the trigger width up to this cap.
   */
  dropdownMaxWidth?: number | string;
  /** Sort order for groups. Default: 'asc' */
  sortGroups?: CoarSelectSortGroups;
  /** Sort order for options (within each group, or all if ungrouped). Default: 'none' */
  sortOptions?: CoarSelectSortOptions<T>;
}

const props = withDefaults(defineProps<CoarMultiSelectProps<T>>(), {
  placeholder: 'Select options...',
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
  showSelectAll: false,
  selectAllLabel: 'Select All',
  compareWith: undefined,
  dropdownPosition: 'auto',
  sortGroups: 'asc',
  sortOptions: 'none',
});

const model = defineModel<T[]>({ default: () => [] });

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
  toggleDropdown,
  closeDropdown,
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

const selectedCount = computed(() => model.value.length);

const displayText = computed(() => {
  if (selectedCount.value === 0) return '';
  const selected = props.options.filter((o) =>
    model.value.some((v) => compare.value(v, o.value)),
  );
  if (selected.length === 1) return selected[0].label;
  return `${selected.length} selected`;
});

const selectedLabels = computed(() => {
  if (selectedCount.value <= 1) return '';
  return props.options
    .filter((o) => model.value.some((v) => compare.value(v, o.value)))
    .map((o) => o.label)
    .join(', ');
});

const tooltipConfig = computed(() => {
  if (!selectedLabels.value || isOpen.value) return false;
  return { content: selectedLabels.value, placement: 'top' as const, openDelay: 400 };
});

const enabledOptions = computed(() => filteredOptions.value.filter((o) => !o.disabled));

const allSelected = computed(() => {
  if (enabledOptions.value.length === 0) return false;
  return enabledOptions.value.every((o) =>
    model.value.some((v) => compare.value(v, o.value)),
  );
});

const someSelected = computed(() => {
  if (allSelected.value) return false;
  return enabledOptions.value.some((o) =>
    model.value.some((v) => compare.value(v, o.value)),
  );
});

const showClearButton = computed(() =>
  props.clearable && selectedCount.value > 0 && !props.disabled && !props.readonly,
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
  return model.value.some((v) => compare.value(v, option.value));
}

function toggleOption(option: CoarSelectOption<T>) {
  if (option.disabled || props.disabled || props.readonly) return;
  const idx = model.value.findIndex((v) => compare.value(v, option.value));
  if (idx >= 0) {
    model.value = [...model.value.slice(0, idx), ...model.value.slice(idx + 1)];
  } else {
    model.value = [...model.value, option.value];
  }
}

function toggleAll() {
  if (props.disabled || props.readonly) return;
  if (allSelected.value) {
    model.value = model.value.filter(
      (v) => !enabledOptions.value.some((o) => compare.value(o.value, v)),
    );
  } else {
    const newValues = [...model.value];
    for (const o of enabledOptions.value) {
      if (!model.value.some((v) => compare.value(v, o.value))) {
        newValues.push(o.value);
      }
    }
    model.value = newValues;
  }
}

function selectHighlighted() {
  const options = filteredOptions.value;
  const idx = highlightedIndex.value;
  if (idx >= 0 && idx < options.length && !options[idx].disabled) {
    toggleOption(options[idx]);
  }
}

function clearSelection(event: Event) {
  event.stopPropagation();
  model.value = [];
}

function onTriggerClick(event: Event) {
  event.stopPropagation();
  toggleDropdown(triggerRef.value ?? undefined);
  if (isOpen.value && props.searchable) {
    nextTick(() => searchInputRef.value?.focus());
  }
}

function handleKeyDown(event: KeyboardEvent) {
  const isSearchFocused = searchInputRef.value != null && event.target === searchInputRef.value;
  onKeyDown(event, selectHighlighted, triggerRef.value ?? undefined, isSearchFocused);
  if (isOpen.value && props.searchable && event.key !== 'Escape' && event.key !== 'Tab') {
    nextTick(() => searchInputRef.value?.focus());
  }
  if (!isOpen.value && event.key === 'Escape') {
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
      size: resolveDropdownSize(props.dropdownMaxWidth),
    },
    content: { kind: 'component', component: markRaw(CoarMultiSelectDropdownPanel) },
    inputs: {
      filteredOptions,
      highlightedIndex,
      searchQuery,
      listboxId: listboxId.value,
      optionIdPrefix: inputId.value,
      size: props.size,
      showSelectAll: props.showSelectAll,
      selectAllLabel: props.selectAllLabel,
      allSelected,
      someSelected,
      onToggleAll: toggleAll,
      isSelected,
      onOptionClick: (opt: CoarSelectOption<T>) => toggleOption(opt),
      onHighlight: (i: number) => { highlightedIndex.value = i; },
    },
    parent: parentOverlay,
  });
  overlayRef = ref;

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
        v-tooltip="tooltipConfig"
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
          :placeholder="displayText || placeholder"
          :value="searchQuery"
          autocomplete="off"
          @input="onSearchInput"
          @keydown="handleKeyDown"
          @click.stop
        />
        <span v-else class="coar-select-value" :class="{ 'coar-select-placeholder': selectedCount === 0 }">
          {{ selectedCount > 0 ? displayText : placeholder }}
        </span>

        <span class="coar-select-actions">
          <span v-if="selectedCount > 0" class="coar-multi-select-badge">{{ selectedCount }}</span>
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
  --coar-field-pad: calc(var(--coar-field-padding-x) * var(--coar-component-scale, 1) * var(--coar-component-density, 1));
  padding: 0 var(--coar-field-pad);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-input-radius);
  background: var(--coar-surface-input);
  cursor: pointer;
  transition: border-color var(--coar-duration-fast) var(--coar-ease-out), box-shadow var(--coar-duration-fast) var(--coar-ease-out);
  outline: none;
}

.coar-select--xs .coar-select-trigger { height: var(--coar-component-xs-height); --coar-component-scale: var(--coar-component-xs-scale); }
.coar-select--s .coar-select-trigger { height: var(--coar-component-s-height); --coar-component-scale: var(--coar-component-s-scale); }
.coar-select--l .coar-select-trigger { height: var(--coar-component-l-height); --coar-component-scale: var(--coar-component-l-scale); }

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

.coar-select-trigger--readonly { cursor: default; }

.coar-select-trigger--error { border-color: var(--coar-border-semantic-error-bold); }

.coar-select-trigger--error.coar-select-trigger--focused {
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
}

.coar-select--inline .coar-select-trigger {
  border: none;
  background: transparent;
  box-shadow: none;
}

.coar-select--inline .coar-select-trigger:hover:not(.coar-select-trigger--disabled):not(.coar-select-trigger--readonly) {
  background: var(--coar-background-neutral-tertiary);
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

/* Actions */
.coar-select-actions {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  margin-left: var(--coar-spacing-xs);
  flex-shrink: 0;
}

/* Badge */
.coar-multi-select-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--coar-badge-radius);
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-primary);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-small-bold-weight);
  line-height: var(--coar-line-height-none);
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

.coar-select-clear:hover { opacity: 1; color: var(--coar-icon-neutral-primary); }

/* Arrow */
.coar-select-arrow {
  width: 16px;
  height: 16px;
  color: var(--coar-icon-neutral-secondary);
  transform: rotate(90deg);
  transition: transform var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-select-arrow--open { transform: rotate(-90deg); }

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

@media (prefers-reduced-motion: reduce) {
  .coar-select-trigger,
  .coar-select-clear,
  .coar-select-arrow {
    transition: none;
  }
}
</style>
