<script setup lang="ts">
/**
 * `<CoarTimeSelectionLayer>` — the time ranges of one day that are not
 * events: the selection (hover proposal or dragged range,
 * `useTimeSelection`) and the host's draft (`builder.draft`).
 *
 * Both sit above the events and take no pointer events, so a draft
 * over an event shows the overlap and everything underneath stays
 * clickable. Vertical grid: full column width; horizontal grid: full
 * row height.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import type { CalendarDraftSegment } from '../../../builders/types';
import type { DaySelection } from '../../../composables/useTimeSelection';

const props = defineProps<{
  orientation: 'vertical' | 'horizontal';
  /** Pixel offset along the time axis of a minute of the day. */
  toPx: (minuteOfDay: number) => number;
  selection: DaySelection | null;
  draft: CalendarDraftSegment | null;
}>();

defineSlots<{
  draft?(props: {
    start: CalendarDraftSegment['start'];
    end: CalendarDraftSegment['end'];
    segment: CalendarDraftSegment;
  }): unknown;
}>();

function boxStyle(start: number, end: number): Record<string, string> {
  const from = props.toPx(start);
  const size = Math.max(2, props.toPx(end) - from);
  return props.orientation === 'horizontal'
    ? { left: from + 'px', width: size + 'px' }
    : { top: from + 'px', height: size + 'px' };
}
</script>

<template>
  <div
    v-if="selection"
    class="coar-time-selection"
    :class="[`coar-time-selection--${orientation}`, `coar-time-selection--${selection.phase}`]"
    :style="boxStyle(selection.start, selection.end)"
    data-time-selection
    aria-hidden="true"
  />
  <div
    v-if="draft"
    class="coar-time-draft"
    :class="[
      `coar-time-draft--${orientation}`,
      {
        'coar-time-draft--clipped-start': draft.clippedStart,
        'coar-time-draft--clipped-end': draft.clippedEnd,
        'coar-time-draft--custom': !!$slots.draft,
      },
    ]"
    :style="boxStyle(draft.startMinutes, draft.endMinutes)"
    data-time-draft
    aria-hidden="true"
  >
    <slot name="draft" :start="draft.start" :end="draft.end" :segment="draft" />
  </div>
</template>

<style scoped>
.coar-time-selection,
.coar-time-draft {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
  border-radius: 4px;
}
.coar-time-selection--vertical,
.coar-time-draft--vertical {
  left: 2px;
  right: 2px;
}
.coar-time-selection--horizontal,
.coar-time-draft--horizontal {
  top: 2px;
  bottom: 2px;
}
/* Selection: a light accent fill. The hover proposal is fainter than a range being dragged. */
.coar-time-selection {
  z-index: 96;
  background: color-mix(
    in srgb,
    var(--coar-calendar-selection-color, var(--coar-background-accent-primary, #2563eb)) 14%,
    transparent
  );
  border: 1px dashed
    color-mix(
      in srgb,
      var(--coar-calendar-selection-color, var(--coar-background-accent-primary, #2563eb)) 55%,
      transparent
    );
}
.coar-time-selection--drag {
  background: color-mix(
    in srgb,
    var(--coar-calendar-selection-color, var(--coar-background-accent-primary, #2563eb)) 24%,
    transparent
  );
  border-style: solid;
}
/* Draft: clearly outlined, above the events; an overlap stays visible through the fill. */
.coar-time-draft {
  z-index: 95;
  border: 2px solid var(--coar-calendar-draft-color, var(--coar-background-accent-primary, #2563eb));
  background: color-mix(
    in srgb,
    var(--coar-calendar-draft-color, var(--coar-background-accent-primary, #2563eb)) 16%,
    transparent
  );
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
}
.coar-time-draft--custom {
  border: 0;
  background: none;
  box-shadow: none;
}
.coar-time-draft--vertical.coar-time-draft--clipped-start {
  border-top-style: dashed;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.coar-time-draft--vertical.coar-time-draft--clipped-end {
  border-bottom-style: dashed;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.coar-time-draft--horizontal.coar-time-draft--clipped-start {
  border-left-style: dashed;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.coar-time-draft--horizontal.coar-time-draft--clipped-end {
  border-right-style: dashed;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
</style>
