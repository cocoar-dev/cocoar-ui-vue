<script setup lang="ts">
/**
 * CoarInputFrameButton — a Type-B "edge button" for CoarInputFrame's #actions slot
 * (calendar / dropdown / search / stepper trigger). Fills the field height with its
 * own background + a left separator; its ICON is inset by --coar-field-pad so it
 * clears the (rounded) outer edge. The frame clips the outer corner to
 * --coar-input-radius via overflow:hidden, so this button needs no own radius.
 *
 * Internal — used by the Coar input components, not exported.
 */
withDefaults(
  defineProps<{
    disabled?: boolean;
    /** Plain = transparent, no background/separator (e.g. a bare icon affix-button). */
    plain?: boolean;
    type?: 'button' | 'submit';
    ariaLabel?: string;
  }>(),
  { disabled: false, plain: false, type: 'button' },
);
</script>

<template>
  <button
    class="coar-input-frame-button"
    :class="{ 'coar-input-frame-button--plain': plain }"
    :type="type"
    :disabled="disabled"
    :aria-label="ariaLabel"
    tabindex="-1"
  >
    <slot />
  </button>
</template>

<style scoped>
.coar-input-frame-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 100%;
  /* Icon inset: field-pad on the separator (left) side; on the OUTER (right) side
     it clears the actual rounded cap, so use max(field-pad, corner). At default
     radius corner ≤ field-pad → unchanged; at full/pill radius the icon steps in
     to sit clear of the curve, matching how the floating Type-A affixes read.
     (This button is the rightmost #actions child — the side that meets the curve.) */
  padding-left: var(--coar-field-pad);
  padding-right: max(var(--coar-field-pad), var(--coar-input-corner, 0px));
  border: none;
  border-left: 1px solid var(--coar-border-input);
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-input-frame-button:hover:not(:disabled) {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-icon-neutral-primary);
}

.coar-input-frame-button:disabled {
  cursor: not-allowed;
  color: var(--coar-icon-neutral-disabled);
}

/* Plain: a bare icon button (no segment background / separator) — still inset. */
.coar-input-frame-button--plain {
  border-left: none;
  background: transparent;
}
.coar-input-frame-button--plain:hover:not(:disabled) {
  background: transparent;
  color: var(--coar-icon-neutral-primary);
}
</style>
