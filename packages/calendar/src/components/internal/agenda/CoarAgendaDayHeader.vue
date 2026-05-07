<script setup lang="ts">
/**
 * `<CoarAgendaDayHeader>` — internal day-group header row.
 *
 * Used in two places by `<CoarAgendaView>`:
 *
 *   1. Inline inside the virtualized list, scrolling with the rows.
 *   2. As the FLOATING sticky overlay above the surface, with an
 *      inline `transform: translateY(-pushOffset)` for the push-out
 *      swap animation.
 *
 * Both use cases share the same visual language (today highlight,
 * empty-day italics, "today" badge), so they share this component.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import type { Temporal, AgendaHeaderItem } from '../../../core';

interface Props {
  /** Plain calendar date (no zone). */
  date: Temporal.PlainDate;
  /** Original AgendaHeaderItem (passed back through the slot). */
  item: AgendaHeaderItem;
  isToday?: boolean;
  /** Locale-aware label, e.g. "Wed, April 15" or "Mittwoch, 15. April". */
  label: string;
  /** Localised "today" badge text. */
  todayLabel: string;
  /** When true, makes the row a sticky overlay (used by the float). */
  floating?: boolean;
  /** CSS `transform` value for the floating push-out animation. */
  transform?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isToday: false,
  floating: false,
  transform: 'none',
});

const emit = defineEmits<{
  pointerdown: [native: PointerEvent];
}>();

defineSlots<{
  /** Custom header content. Receives `date` + `item` + `isToday`. */
  default(props: {
    date: Temporal.PlainDate;
    item: AgendaHeaderItem;
    isToday: boolean;
  }): unknown;
}>();

function onPointerdown(e: PointerEvent) {
  emit('pointerdown', e);
}
</script>

<template>
  <div
    class="coar-agenda-day-header"
    :class="{
      'coar-agenda-day-header--today': isToday,
      'coar-agenda-day-header--empty': item.isEmpty,
      'coar-agenda-day-header--floating': floating,
    }"
    :style="floating ? { transform } : undefined"
    :role="floating ? 'presentation' : 'heading'"
    :aria-level="floating ? undefined : 3"
    @pointerdown="onPointerdown"
  >
    <slot :date="date" :item="item" :is-today="isToday">
      <span class="coar-agenda-day-header__label">{{ label }}</span>
      <span v-if="isToday" class="coar-agenda-day-header__today">{{ todayLabel }}</span>
    </slot>
  </div>
</template>

<style scoped>
.coar-agenda-day-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 16px;
  background: var(--coar-calendar-bg, #fff);
  border-bottom: 1px solid var(--coar-calendar-border, #e3e5e9);
  font-weight: 600;
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-base, #1a1c1f);
}
.coar-agenda-day-header--today {
  color: var(--coar-color-accent, #2563eb);
}
.coar-agenda-day-header--empty {
  color: var(--coar-text-subtle, #9ca3af);
  font-style: italic;
}
.coar-agenda-day-header--floating {
  /* Floating overlay above the surface — outside the absolute-
     positioned virtual items, so it doesn't scroll with them.
     `will-change: transform` keeps the overlay on its own
     compositor layer so the per-frame translateY (during the
     push-out) doesn't trigger a paint or layout. */
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  /* Reserve space on the right for the surface's scrollbar so the
     overlay doesn't overlap it. 14 px is roughly Chrome's overlay/
     classic scrollbar width; harmless on touch devices. */
  margin-right: 14px;
  will-change: transform;
}
.coar-agenda-day-header__today {
  font-size: var(--coar-font-size-xs, 11px);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--coar-color-accent, #2563eb);
  color: #fff;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 700;
}
</style>
