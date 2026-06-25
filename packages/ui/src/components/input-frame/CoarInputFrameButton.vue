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
  /* Icon inset from each side = field padding → the icon clears the rounded edge.
     Width follows the icon + this padding, so the token controls the inset. */
  padding: 0 var(--coar-field-pad);
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
