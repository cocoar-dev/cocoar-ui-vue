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
  computed, inject, toRef, watch, onBeforeUnmount, onBeforeUpdate, shallowRef, useAttrs, useTemplateRef, nextTick, markRaw,
  type VNode,
} from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon } from '../icon';
import { useSelectBase, resolveDropdownSize, type CoarSelectSize, type CoarSelectAppearance } from './useSelectBase';
import { getOverlayService, useOverlayParent } from '../overlay/useOverlay';
import { selectPreset } from '../overlay/overlay-presets';
import type { OverlayRef } from '../overlay/overlay-types';
import type {
  CoarSelectOption, CoarSelectSortGroups, CoarSelectSortOptions,
  CoarSelectValueSlotProps, CoarSelectOptionSlotProps,
} from './types';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';
import CoarInputFrame from '../input-frame/CoarInputFrame.vue';
import type { CoarInputWidth } from '../input-frame/types';
import CoarSelectDropdownPanel from './CoarSelectDropdownPanel.vue';

export interface CoarSelectProps<T = unknown> {
  /** Placeholder text */
  placeholder?: string;
  /** Available options */
  options?: CoarSelectOption<T>[];
  /** Select size */
  size?: CoarSelectSize;
  /** `inline`: no border or surface until hovered or open */
  appearance?: CoarSelectAppearance;
  /** `content`: as wide as the selected label or placeholder (Preview) */
  width?: CoarInputWidth;
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
  /**
   * Max width of the dropdown panel. Omitted (default) → the panel is fixed to
   * the trigger width and long labels truncate with an ellipsis + tooltip. Set
   * a number (px) or CSS length → the panel may grow from the trigger width up
   * to this cap before truncating.
   */
  dropdownMaxWidth?: number | string;
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
  width: 'fill',
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

defineOptions({ inheritAttrs: false });

const model = defineModel<T | null>({ default: null });

const slots = defineSlots<{
  /** Content of the closed select: the selected option, or the empty state. */
  value?(scope: CoarSelectValueSlotProps<T>): VNode[];
  /** Content of an option in the dropdown. */
  option?(scope: CoarSelectOptionSlotProps<T>): VNode[];
}>();
// The dropdown is mounted by the overlay service, outside this component's
// render. Vue's slots object is not reactive, so mirror the current option slot
// before each update: an open dropdown follows a slot that changes or appears.
const optionSlot = shallowRef(slots.option);
onBeforeUpdate(() => { optionSlot.value = slots.option; });

const { t } = useI18n();

const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

const hostRef = useTemplateRef<HTMLElement>('hostRef');
// The trigger IS the CoarInputFrame root (combobox role/aria/handlers fall through
// to it). useTemplateRef gives the component instance, so reach its root element
// for overlay anchoring / focus via $el.
const triggerRef = useTemplateRef('triggerRef');
const triggerEl = (): HTMLElement | undefined =>
  (triggerRef.value as unknown as { $el?: HTMLElement } | null)?.$el ?? undefined;
const searchInputRef = useTemplateRef<HTMLInputElement>('searchInputRef');

const hasError = computed(() => props.error || (formField?.hasError.value ?? false));

const {
  isOpen,
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
const labelledBy = computed(() => formField?.labelId.value || undefined);
// Without a form-field label, an `aria-label` given to the select names the
// combobox; the host element, which has no role, gets the other attributes.
// `useAttrs()` is not reactive: read it while rendering, not in a computed.
const attrs = useAttrs();
const ariaLabel = () =>
  labelledBy.value ? undefined : (attrs['aria-label'] as string | undefined);
const hostAttrs = () =>
  Object.fromEntries(Object.entries(attrs).filter(([name]) => name !== 'aria-label'));

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
    'coar-select--content': props.width === 'content',
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
  nextTick(() => triggerEl()?.focus());
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
  toggleDropdown(triggerEl());
  if (isOpen.value && props.searchable) {
    nextTick(() => searchInputRef.value?.focus());
  }
}

// Also handles the keys of the inline search, which sit inside the trigger and
// bubble up to it. The search has no handler of its own: a second one would run
// after a selection had closed the list, and Enter would open it again.
function handleKeyDown(event: KeyboardEvent) {
  const wasOpen = isOpen.value;
  const isSearchFocused = searchInputRef.value != null && event.target === searchInputRef.value;
  onKeyDown(event, selectHighlighted, triggerEl(), isSearchFocused);
  if (isOpen.value && props.searchable && event.key !== 'Escape' && event.key !== 'Tab') {
    nextTick(() => searchInputRef.value?.focus());
  }
  if (wasOpen && !isOpen.value && event.key === 'Escape') {
    nextTick(() => triggerEl()?.focus());
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
  const trigger = triggerEl();
  if (!trigger || overlayRef) return;

  const ref = getOverlayService().open({
    spec: {
      ...selectPreset,
      anchor: { kind: 'element', element: trigger },
      size: resolveDropdownSize(props.dropdownMaxWidth),
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
      optionSlot,
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
  <div ref="hostRef" v-bind="hostAttrs()" :class="hostClasses">
    <div class="coar-select-wrapper">
      <!-- Trigger = the shared input shell (combobox role/aria/handlers fall through
           to its root). The frame paints both appearances. -->
      <CoarInputFrame
        :id="inputId"
        ref="triggerRef"
        class="coar-select-trigger coar-select-frame"
        mobile-sizing
        :size="size"
        :error="hasError"
        :disabled="disabled"
        :readonly="readonly"
        :active="isOpen"
        :appearance="appearance"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        :aria-controls="listboxId"
        :aria-activedescendant="activeDescendantId"
        :aria-describedby="describedBy"
        :aria-labelledby="labelledBy"
        :aria-label="ariaLabel()"
        :aria-invalid="hasError ? 'true' : undefined"
        :aria-disabled="disabled ? 'true' : undefined"
        :tabindex="disabled ? -1 : 0"
        role="combobox"
        @click="onTriggerClick"
        @keydown="handleKeyDown"
        @focus="onFocus"
        @blur="handleBlur"
      >
        <!-- Content width: the search lies over the closed label, which keeps
             its width, so the box neither grows nor moves while typing. -->
        <span v-if="isOpen && searchable && width === 'content'" class="coar-select-content-search">
          <span class="coar-select-value coar-select-search-sizer" aria-hidden="true">
            <slot name="value" :option="selectedOption" :value="model" :placeholder="placeholder">
              <CoarIcon v-if="selectedOption?.icon" :name="selectedOption.icon" size="s" class="coar-select-value-icon" />
              {{ selectedOption ? selectedOption.label : placeholder }}
            </slot>
          </span>
          <input
            ref="searchInputRef"
            type="text"
            class="coar-select-inline-search"
            :placeholder="selectedOption?.label || placeholder"
            :value="searchQuery"
            autocomplete="off"
            @input="onSearchInput"
            @click.stop
          />
        </span>
        <!-- Inline search (shown when open + searchable) -->
        <input
          v-else-if="isOpen && searchable"
          ref="searchInputRef"
          type="text"
          class="coar-select-inline-search"
          :placeholder="selectedOption?.label || placeholder"
          :value="searchQuery"
          autocomplete="off"
          @input="onSearchInput"
          @click.stop
        />
        <!-- Selected Value or Placeholder -->
        <span v-else class="coar-select-value" :class="{ 'coar-select-placeholder': !selectedOption }">
          <slot name="value" :option="selectedOption" :value="model" :placeholder="placeholder">
            <template v-if="selectedOption">
              <CoarIcon v-if="selectedOption.icon" :name="selectedOption.icon" size="s" class="coar-select-value-icon" />
              {{ selectedOption.label }}
            </template>
            <template v-else>{{ placeholder }}</template>
          </slot>
        </span>

        <!-- Clear + chevron → trailing affixes (both Type A inline, not edge-buttons) -->
        <template #trailing>
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
        </template>
      </CoarInputFrame>
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

/* Content width: as wide as the label or placeholder, at most the line. */
.coar-select--content {
  display: inline-block;
  inline-size: max-content;
  max-inline-size: 100%;
}
.coar-select-content-search {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
}
.coar-select-search-sizer {
  visibility: hidden;
}
.coar-select-content-search .coar-select-inline-search {
  position: absolute;
  inset: 0;
  width: 100%;
}

/* Trigger — box / radius / size / states are owned by CoarInputFrame. Only the
   pointer affordance lives here. */
.coar-select-trigger:not(.coar-input-frame--disabled):not(.coar-input-frame--readonly) {
  cursor: pointer;
}

/* Value */
.coar-select-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  min-width: 0;
  font-family: var(--coar-body-small-base-family);
  font-size: max(var(--coar-field-font-size, var(--coar-body-small-base-size)), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-select-placeholder { color: var(--coar-text-placeholder); }

.coar-select--xs .coar-select-value { font-size: max(var(--coar-field-xs-font-size, var(--coar-field-xs-default-font-size, var(--coar-field-font-size, var(--coar-component-xs-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px)); }
.coar-select--s .coar-select-value { font-size: max(var(--coar-field-s-font-size, var(--coar-field-s-default-font-size, var(--coar-field-font-size, var(--coar-component-s-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px)); }
.coar-select--l .coar-select-value { font-size: max(var(--coar-field-l-font-size, var(--coar-field-l-default-font-size, var(--coar-field-font-size, var(--coar-component-l-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px)); }

/* Clear — sized by intrinsic icon dimensions like the other input
 * controls (TextInput / NumberInput / DatePickers). Hardcoded 16×16
 * here used to make the button visually fatter than its peers. */
.coar-select-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: var(--coar-control-min-target-size, auto);
  min-height: var(--coar-control-min-target-size, auto);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-disabled);
  cursor: pointer;
  border-radius: var(--coar-radius-xs);
  transition: color var(--coar-duration-fast) var(--coar-ease-out), opacity var(--coar-duration-fast) var(--coar-ease-out);
  opacity: var(--coar-control-clear-opacity, 0.4);
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
  font-size: max(var(--coar-field-font-size, var(--coar-body-small-base-size)), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  outline: none;
}

.coar-select-inline-search::placeholder {
  color: var(--coar-text-placeholder);
}

.coar-select--xs .coar-select-inline-search { font-size: max(var(--coar-field-xs-font-size, var(--coar-field-xs-default-font-size, var(--coar-field-font-size, var(--coar-component-xs-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px)); }
.coar-select--s .coar-select-inline-search { font-size: max(var(--coar-field-s-font-size, var(--coar-field-s-default-font-size, var(--coar-field-font-size, var(--coar-component-s-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px)); }
.coar-select--l .coar-select-inline-search { font-size: max(var(--coar-field-l-font-size, var(--coar-field-l-default-font-size, var(--coar-field-font-size, var(--coar-component-l-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px)); }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .coar-select-trigger,
  .coar-select-clear,
  .coar-select-arrow {
    transition: none;
  }
}
</style>
