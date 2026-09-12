<script setup lang="ts">
/**
 * `<CoarMonthDayOverlay>` — the day sheet a "+N" click opens over
 * its month cell.
 *
 * Lists EVERY single-day event of that day: the parent renders the
 * pills into the default slot with the same drag / keyboard /
 * double-click wiring as in the cell, so an event can be dragged
 * straight out of the sheet onto another day. The list scrolls when
 * it outgrows `maxListHeight`. Escape or the close control closes.
 *
 * Positioning (top / left / width, flip-up when the space below is
 * short) and outside-click handling live in `useMonthDayOverlay` —
 * this component is purely presentational.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { onMounted, ref } from 'vue';

interface Props {
  /** Day number for the header — mirrors the covered cell. */
  dayNumber: number;
  /** Short header text next to the number, e.g. "Mo., 15. Juni". */
  heading: string;
  /** Localized long date — the dialog's accessible name. */
  label: string;
  closeLabel: string;
  /** Position inside the month view's box, in px. */
  top: number;
  left: number;
  width: number;
  /** Upper bound for the list before it scrolls, in px. */
  maxListHeight: number;
  isToday?: boolean;
}

withDefaults(defineProps<Props>(), { isToday: false });

const emit = defineEmits<{
  close: [];
}>();

defineSlots<{
  /** The day's pills (live, phantom, invalid ghost). */
  default(): unknown;
}>();

const root = ref<HTMLElement | null>(null);

function onKeydown(e: KeyboardEvent) {
  // A keyboard drag in flight owns Escape (it cancels the drag and
  // calls preventDefault); the sheet only closes on a free Escape.
  if (e.key === 'Escape' && !e.defaultPrevented) {
    e.stopPropagation();
    emit('close');
  }
}

onMounted(() => {
  root.value?.focus({ preventScroll: true });
});

defineExpose({
  /** Root element — the parent's outside-click test needs it. */
  el: root,
});
</script>

<template>
  <div
    ref="root"
    class="coar-month-day-overlay"
    :class="{ 'coar-month-day-overlay--today': isToday }"
    role="dialog"
    :aria-label="label"
    tabindex="-1"
    :style="{ top: top + 'px', left: left + 'px', width: width + 'px' }"
    @keydown="onKeydown"
  >
    <div class="coar-month-day-overlay__header">
      <span class="coar-month-day-overlay__day-number">{{ dayNumber }}</span>
      <span class="coar-month-day-overlay__heading">{{ heading }}</span>
      <button
        type="button"
        class="coar-month-day-overlay__close"
        :aria-label="closeLabel"
        @pointerdown.stop
        @click.stop="emit('close')"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path
            d="M2.5 2.5l7 7M9.5 2.5l-7 7"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
    <div class="coar-month-day-overlay__list" :style="{ maxHeight: maxListHeight + 'px' }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.coar-month-day-overlay {
  position: absolute;
  z-index: 30;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 0 0 4px;
  background: var(--coar-calendar-bg, #fff);
  border: 1px solid var(--coar-calendar-border, #d1d5db);
  border-radius: var(--coar-radius-md, 8px);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.16),
    0 2px 6px rgba(0, 0, 0, 0.08);
  outline: none;
  font-variant-numeric: tabular-nums;
}
.coar-month-day-overlay:focus-visible {
  outline: 2px solid var(--coar-color-focus, #2563eb);
  outline-offset: 1px;
}

.coar-month-day-overlay__header {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 4px 4px 2px 6px;
}
.coar-month-day-overlay__day-number {
  font-size: var(--coar-font-size-sm, 13px);
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
}
.coar-month-day-overlay--today .coar-month-day-overlay__day-number {
  color: var(--coar-color-accent, var(--coar-color-accent-500, #2563eb));
}
.coar-month-day-overlay__heading {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--coar-font-size-xs, 11px);
  color: var(--coar-text-subtle, #6c7280);
}
.coar-month-day-overlay__close {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: var(--coar-radius-xs, 2px);
  background: transparent;
  color: var(--coar-text-subtle, #6c7280);
  cursor: pointer;
}
.coar-month-day-overlay__close:hover,
.coar-month-day-overlay__close:focus-visible {
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  color: var(--coar-text-base, #1a1c1f);
}

.coar-month-day-overlay__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 3px 4px 2px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--coar-border-neutral-tertiary, #d1d5db) transparent;
}
.coar-month-day-overlay__list::-webkit-scrollbar {
  width: 6px;
}
.coar-month-day-overlay__list::-webkit-scrollbar-thumb {
  background: var(--coar-border-neutral-tertiary, #d1d5db);
  border-radius: 3px;
}
</style>
