<script setup lang="ts">
/**
 * CoarInputFrame — internal shared shell for the input family (text / password /
 * number / select / date-pickers). Encapsulates the bordered, rounded, sized box
 * and the field-padding contract so every input gets identical padding / radius /
 * states / edge-button behaviour from ONE place (see .local/INPUTS.md anatomy).
 *
 * NOT exported from the package — consumed by the Coar input components only.
 *
 * Anatomy (single-line): Leading · Field · Trailing · Actions
 *  - leading / trailing = inline affixes (Type A): prefix / suffix / clear. The
 *    frame insets the OUTER one by --coar-field-pad and uses a fixed inner gap
 *    towards the field.
 *  - actions = edge-buttons (Type B): calendar / chevron / stepper / search. They
 *    fill the right edge (own background, separator, rounded outer corner that
 *    follows --coar-input-radius); their ICON is inset by --coar-field-pad. Use
 *    CoarInputFrameButton for each.
 *
 * The rule: --coar-field-pad = clearance to the OUTER (rounded) border; everything
 * internal uses fixed spacing tokens.
 */
import { computed, useSlots } from 'vue';

withDefaults(
  defineProps<{
    size?: 'xs' | 's' | 'm' | 'l';
    error?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    /** Visual open/active state (e.g. a picker panel is open) — mirrors focus styling. */
    active?: boolean;
    /**
     * Borderless ("inline") variant: no border / surface / focus ring. Keeps the
     * box model (a transparent 1px border) and radius so an inline control aligns
     * with its bordered siblings; the consumer supplies any hover/active fill.
     * Used by the selects' `appearance="inline"`.
     */
    borderless?: boolean;
  }>(),
  { size: 'm', error: false, disabled: false, readonly: false, active: false, borderless: false },
);

const slots = useSlots();
const hasLeading = computed(() => !!slots.leading);
const hasTrailing = computed(() => !!slots.trailing);
const hasActions = computed(() => !!slots.actions);
</script>

<template>
  <div
    class="coar-input-frame"
    :class="[
      `coar-input-frame--${size}`,
      {
        'coar-input-frame--error': error,
        'coar-input-frame--disabled': disabled,
        'coar-input-frame--readonly': readonly,
        'coar-input-frame--active': active,
        'coar-input-frame--borderless': borderless,
        'coar-input-frame--has-leading': hasLeading,
        'coar-input-frame--has-trailing': hasTrailing,
        'coar-input-frame--has-actions': hasActions,
      },
    ]"
  >
    <span v-if="hasLeading" class="coar-input-frame__affix coar-input-frame__leading">
      <slot name="leading" />
    </span>

    <div class="coar-input-frame__field">
      <slot />
    </div>

    <span v-if="hasTrailing" class="coar-input-frame__affix coar-input-frame__trailing">
      <slot name="trailing" />
    </span>

    <div v-if="hasActions" class="coar-input-frame__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.coar-input-frame {
  /* --coar-field-pad = base × per-size scale × density. Single source for the
     whole input family; the consumer never recomputes it. */
  --coar-field-pad: calc(
    var(--coar-field-padding-x) * var(--coar-component-scale, 1) * var(--coar-component-density, 1)
  );
  display: flex;
  align-items: center;
  height: var(--coar-component-m-height);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-input-radius);
  background: var(--coar-surface-input);
  /* clip the edge-buttons' corners to the frame's radius (incl. full/pill) */
  overflow: hidden;
  transition:
    border-color var(--coar-duration-fast) var(--coar-ease-out),
    box-shadow var(--coar-duration-fast) var(--coar-ease-out);
}

/* ── Size variants (height + per-size scale + font) ─────────────── */
.coar-input-frame--xs {
  height: var(--coar-component-xs-height);
  --coar-component-scale: var(--coar-component-xs-scale);
  font-size: var(--coar-component-xs-font-size);
}
.coar-input-frame--s {
  height: var(--coar-component-s-height);
  --coar-component-scale: var(--coar-component-s-scale);
  font-size: var(--coar-component-s-font-size);
}
.coar-input-frame--m {
  font-size: var(--coar-component-m-font-size);
}
.coar-input-frame--l {
  height: var(--coar-component-l-height);
  --coar-component-scale: var(--coar-component-l-scale);
  font-size: var(--coar-component-l-font-size);
}

/* ── States ─────────────────────────────────────────────────────── */
.coar-input-frame:hover:not(.coar-input-frame--disabled):not(.coar-input-frame--readonly):not(
    .coar-input-frame--error
  ) {
  border-color: var(--coar-border-input-hover);
}
.coar-input-frame:focus-within,
.coar-input-frame--active {
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
}
.coar-input-frame--error {
  border-color: var(--coar-border-semantic-error-bold);
}
.coar-input-frame--error:focus-within,
.coar-input-frame--error.coar-input-frame--active {
  /* Keep the error border on focus/active — must re-assert border-color, else the
     generic :focus-within rule (same specificity) wins and the border turns blue. */
  border-color: var(--coar-border-semantic-error-bold);
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
}
.coar-input-frame--disabled {
  background: var(--coar-surface-input-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

/* ── Borderless / inline variant ────────────────────────────────── */
/* Transparent border keeps the box model identical to bordered siblings; the
   consumer paints any hover/active fill. Focus ring + border are suppressed. */
.coar-input-frame--borderless {
  border-color: transparent;
  background: transparent;
}
.coar-input-frame--borderless:hover:not(.coar-input-frame--disabled):not(.coar-input-frame--readonly):not(
    .coar-input-frame--error
  ),
.coar-input-frame--borderless:focus-within,
.coar-input-frame--borderless.coar-input-frame--active {
  border-color: transparent;
  box-shadow: none;
}

/* ── Field (the input / value) ──────────────────────────────────── */
.coar-input-frame__field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  height: 100%;
}
/* Left outer edge: field-pad only when there's no leading affix; otherwise a
   fixed inner gap towards the leading affix. */
.coar-input-frame:not(.coar-input-frame--has-leading) .coar-input-frame__field {
  padding-left: var(--coar-field-pad);
}
.coar-input-frame--has-leading .coar-input-frame__field {
  padding-left: var(--coar-spacing-s);
}
/* Right outer edge: field-pad only when nothing trails the field; otherwise a
   fixed inner gap (to the trailing affix or the edge-button separator). */
.coar-input-frame:not(.coar-input-frame--has-trailing):not(.coar-input-frame--has-actions)
  .coar-input-frame__field {
  padding-right: var(--coar-field-pad);
}
.coar-input-frame--has-trailing .coar-input-frame__field,
.coar-input-frame--has-actions .coar-input-frame__field {
  padding-right: var(--coar-spacing-s);
}

/* ── Inline affixes (Type A) ────────────────────────────────────── */
.coar-input-frame__affix {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--coar-icon-neutral-secondary);
}
.coar-input-frame__leading {
  /* outer left edge */
  padding-left: var(--coar-field-pad);
  gap: var(--coar-spacing-xs);
}
.coar-input-frame__trailing {
  gap: var(--coar-spacing-xs);
}
/* trailing is the outer-right edge only when no edge-buttons follow */
.coar-input-frame:not(.coar-input-frame--has-actions) .coar-input-frame__trailing {
  padding-right: var(--coar-field-pad);
}
.coar-input-frame--has-actions .coar-input-frame__trailing {
  padding-right: var(--coar-spacing-s);
}

/* ── Actions (Type B edge-buttons) ──────────────────────────────── */
.coar-input-frame__actions {
  display: flex;
  align-self: stretch;
  flex-shrink: 0;
}
</style>
