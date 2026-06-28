<script setup lang="ts">
/**
 * CoarInputFrameButton — a Type-B "edge button" for CoarInputFrame's #actions slot
 * (calendar / dropdown / search / stepper trigger). Fills the field height with its
 * own background + a left separator. The icon's separator-side (left) inset is a
 * fixed spacing token; its OUTER (right) inset is max(--coar-field-pad, corner) so
 * it clears the rounded cap and tracks the field-padding knob. The frame clips the
 * outer corner to --coar-input-radius via overflow:hidden, so it needs no own radius.
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
  /* Icon insets follow the frame contract: --coar-field-pad is the clearance to the
     OUTER (rounded) border only; internal boundaries use a fixed spacing token.
     - left  = the SEPARATOR side (internal) → spacing-s scaled by the per-size
       --coar-component-scale (inherited from the frame), so it grows with the
       control like field-pad does but stays independent of the field-padding knob.
     - right = the OUTER side that meets the rounded cap → max(field-pad, corner),
       so the icon clears the curve at full/pill radius and tracks the padding knob
       (matching every other rightmost icon: clear / eye / chevron). */
  padding-left: calc(var(--coar-spacing-s) * var(--coar-component-scale, 1));
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
