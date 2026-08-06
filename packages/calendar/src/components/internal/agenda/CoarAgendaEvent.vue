<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarAgendaEvent>` — internal presentational component for one
 * event row in the agenda list.
 *
 * Owns the row's hover-tint, click target, optional continuation
 * styling, and the default content layout (color dot + time +
 * title + optional `(cont.)` tag). Slot consumers replace the
 * default content via the `default` slot.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import type { CalendarEvent, AgendaEventItem } from '../../../core';
import CoarEventDecorations from '../CoarEventDecorations.vue';
import CoarEventAssignees from '../CoarEventAssignees.vue';

// Inlined defineProps argument to avoid vue-tsc TS4025 — see note in
// CoarMonthView.vue.
defineProps<{
  event: CalendarEvent<TMeta>;
  item: AgendaEventItem<TMeta>;
  /** Time string formatted by the parent (locale-aware). */
  timeLabel: string;
  /** Title text (parent reads from `meta.title` or returns fallback). */
  title: string;
  /** Hex / CSS color (parent reads from `meta.color` or default). */
  color: string;
  /** Localised "(cont.)" tag, only rendered when isContinuation. */
  continuationTag: string;
  /** Display zone — surfaced on the default decoration layer (C3/C5 hints). */
  displayZone?: string;
}>();

const emit = defineEmits<{
  pointerdown: [native: PointerEvent];
  dblclick: [native: MouseEvent];
}>();

defineSlots<{
  /**
   * Custom row content. Receives `event` + `item` so the consumer
   * can build their own layout. Default fallback renders the color
   * dot + time + title.
   */
  default(props: { event: CalendarEvent<TMeta>; item: AgendaEventItem<TMeta> }): unknown;
}>();

function onPointerdown(e: PointerEvent) {
  emit('pointerdown', e);
}
function onDblclick(e: MouseEvent) {
  e.stopPropagation();
  emit('dblclick', e);
}
</script>

<template>
  <div
    class="coar-agenda-event"
    :class="{ 'coar-agenda-event--continuation': item.isContinuation }"
    role="listitem"
    @pointerdown="onPointerdown"
    @dblclick="onDblclick"
  >
    <slot :event="event" :item="item">
      <div class="coar-agenda-event__default">
        <span class="coar-agenda-event__color" :style="{ background: color }" />
        <span class="coar-agenda-event__time">{{ timeLabel }}</span>
        <span class="coar-agenda-event__title">
          <CoarEventDecorations :event="event" :display-zone="displayZone" size="s" />
          {{ title }}
          <span v-if="item.isContinuation" class="coar-agenda-event__continuation-tag">{{
            continuationTag
          }}</span>
        </span>
        <CoarEventAssignees :event="event" :max="3" size="m" />
      </div>
    </slot>
  </div>
</template>

<style scoped>
.coar-agenda-event {
  padding: 10px 16px;
  /* Own token (falls back to the border token): the row separator
     stays near-invisible in dark mode while borders don't. */
  border-bottom: 1px solid var(--coar-calendar-agenda-divider, var(--coar-calendar-border, #f3f4f6));
  cursor: pointer;
  user-select: none;
  background: var(--coar-calendar-bg, #fff);
  transition: background-color 80ms ease;
}
.coar-agenda-event:hover {
  background: var(--coar-surface-subtle, #f6f7f9);
}
.coar-agenda-event--continuation {
  opacity: 0.7;
}

.coar-agenda-event__default {
  display: flex;
  align-items: center;
  gap: 12px;
}
.coar-agenda-event__color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.coar-agenda-event__time {
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-subtle, #6c7280);
  min-width: 80px;
  font-variant-numeric: tabular-nums;
}
.coar-agenda-event__title {
  font-size: var(--coar-font-size-base, 14px);
  color: var(--coar-text-base, #1a1c1f);
  font-weight: 500;
  min-width: 0;
}
.coar-agenda-event__continuation-tag {
  margin-left: 6px;
  font-size: var(--coar-font-size-xs, 11px);
  color: var(--coar-text-subtle, #9ca3af);
  font-style: italic;
  font-weight: 400;
}
</style>
