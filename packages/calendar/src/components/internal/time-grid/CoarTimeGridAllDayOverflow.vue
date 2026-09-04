<script setup lang="ts">
/**
 * `<CoarTimeGridAllDayOverflow>` — the "+N" marker that stands in
 * for hidden all-day bars in one day column while the band is
 * capped. Clicking it expands the band.
 *
 * Positioned exactly like a one-column `<CoarTimeGridAllDayBar>`
 * in the marker lane, so it reads as "one more row of the band".
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

defineProps<{
  /** Hidden bars in this column. */
  hidden: number;
  /** Localised accessible label, e.g. "3 more all-day events — show all". */
  ariaLabel: string;
  top: number;
  left: string;
  width: string;
  height: number;
}>();

const emit = defineEmits<{ expand: [] }>();
</script>

<template>
  <button
    type="button"
    class="coar-time-grid-all-day-overflow"
    :style="{ top: top + 'px', left, width, height: height + 'px' }"
    :aria-label="ariaLabel"
    @pointerdown.stop
    @dblclick.stop
    @click.stop="emit('expand')"
  >
    +{{ hidden }}
  </button>
</template>

<style scoped>
.coar-time-grid-all-day-overflow {
  position: absolute;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border: 1px dashed var(--coar-calendar-border, #d1d5db);
  border-radius: var(--coar-radius-xs, 4px);
  background: transparent;
  color: var(--coar-text-subtle, #6c7280);
  font: inherit;
  font-size: var(--coar-font-size-xs, 11px);
  font-weight: 600;
  cursor: pointer;
}
.coar-time-grid-all-day-overflow:hover,
.coar-time-grid-all-day-overflow:focus-visible {
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  color: var(--coar-text-base, #1a1c1f);
}
</style>
