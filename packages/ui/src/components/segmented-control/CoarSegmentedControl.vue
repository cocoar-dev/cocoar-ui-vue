<script setup lang="ts" generic="T">
/**
 * `<CoarSegmentedControl>` — a horizontal group of mutually-exclusive
 * toggles, used for view modes, filters, density, etc.
 *
 * Why not `CoarRadioGroup`? Radio groups carry circular markers and
 * read as a form input. A segmented control reads as a button-bar
 * for view-state — same semantics (single selection from N options),
 * different visual register.
 *
 * Generic over the option's `value` type so the model and event
 * payloads stay strongly typed.
 */
import { computed } from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';

export interface CoarSegmentedControlOption<TValue> {
  value: TValue;
  label: string;
  /** CoarIcon name; rendered before the label. */
  icon?: string;
  disabled?: boolean;
  /** Tooltip / aria-label override for an icon-only segment. */
  ariaLabel?: string;
}

export type SegmentedControlSize = 'xs' | 's' | 'm' | 'l';

export interface CoarSegmentedControlProps<TValue> {
  options: ReadonlyArray<CoarSegmentedControlOption<TValue>>;
  /** Match CoarButton sizes. Defaults to 's'. */
  size?: SegmentedControlSize;
  /** Disable the entire control. */
  disabled?: boolean;
  /** Take the full available width (segments share equally). */
  fullWidth?: boolean;
  /** Label for screen readers. */
  ariaLabel?: string;
}

const props = withDefaults(defineProps<CoarSegmentedControlProps<T>>(), {
  size: 's',
  disabled: false,
  fullWidth: false,
  ariaLabel: undefined,
});

const model = defineModel<T>({ required: true });

const emit = defineEmits<{
  /** Fired when the user picks a different option. */
  change: [value: T, option: CoarSegmentedControlOption<T>];
}>();

function isActive(opt: CoarSegmentedControlOption<T>): boolean {
  return model.value === opt.value;
}

function select(opt: CoarSegmentedControlOption<T>) {
  if (props.disabled || opt.disabled) return;
  if (model.value === opt.value) return;
  model.value = opt.value;
  emit('change', opt.value, opt);
}

const hostClasses = computed(() => [
  'coar-segmented-control',
  `coar-segmented-control--${props.size}`,
  {
    'coar-segmented-control--full-width': props.fullWidth,
    'coar-segmented-control--disabled': props.disabled,
  },
]);
</script>

<template>
  <div
    :class="hostClasses"
    role="group"
    :aria-label="ariaLabel"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      class="coar-segmented-control__segment"
      :class="{
        'coar-segmented-control__segment--active': isActive(opt),
        'coar-segmented-control__segment--disabled': opt.disabled,
      }"
      :disabled="disabled || opt.disabled"
      :aria-pressed="isActive(opt)"
      :aria-label="opt.ariaLabel ?? (opt.icon && !opt.label ? opt.label : undefined)"
      @click="select(opt)"
    >
      <CoarIcon
        v-if="opt.icon"
        :name="opt.icon"
        size="auto"
        class="coar-segmented-control__icon"
      />
      <span v-if="opt.label" class="coar-segmented-control__label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.coar-segmented-control {
  display: inline-flex;
  background: var(--coar-background-neutral-primary, #fff);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-button-radius);
  overflow: hidden;
  font-family: var(--coar-body-base-family);
  font-weight: var(--coar-body-base-weight);
}

.coar-segmented-control--full-width {
  display: flex;
  width: 100%;
}
.coar-segmented-control--full-width .coar-segmented-control__segment {
  flex: 1 1 0;
}

.coar-segmented-control--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.coar-segmented-control__segment {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  background: transparent;
  border: none;
  border-right: 1px solid var(--coar-border-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  font-family: inherit;
  font-weight: inherit;
  white-space: nowrap;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out);
}
.coar-segmented-control__segment:last-child {
  border-right: none;
}

/* Sizes — heights / paddings / font-sizes match CoarButton. */
.coar-segmented-control--xs .coar-segmented-control__segment {
  height: var(--coar-component-xs-height);
  padding: 0 10px;
  font-size: var(--coar-component-xs-font-size);
}
.coar-segmented-control--s .coar-segmented-control__segment {
  height: var(--coar-component-s-height);
  padding: 0 12px;
  font-size: var(--coar-component-s-font-size);
}
.coar-segmented-control--m .coar-segmented-control__segment {
  height: var(--coar-component-m-height);
  padding: 0 var(--coar-spacing-m);
  font-size: var(--coar-component-m-font-size);
}
.coar-segmented-control--l .coar-segmented-control__segment {
  height: var(--coar-component-l-height);
  padding: 0 var(--coar-spacing-l);
  font-size: var(--coar-component-l-font-size);
}

.coar-segmented-control__segment:hover:not(:disabled):not(.coar-segmented-control__segment--active) {
  background: var(--coar-background-neutral-secondary);
}

.coar-segmented-control__segment--active {
  background: var(--coar-background-accent-primary);
  color: var(--coar-text-on-bold);
}

.coar-segmented-control__segment:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: calc(var(--coar-focus-offset) * -1);
  z-index: 1;
}

.coar-segmented-control__segment--disabled {
  cursor: not-allowed;
}

.coar-segmented-control__icon {
  flex: 0 0 auto;
}
</style>
