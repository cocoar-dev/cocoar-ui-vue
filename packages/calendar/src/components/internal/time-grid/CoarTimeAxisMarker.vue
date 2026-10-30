<script setup lang="ts">
/**
 * `<CoarTimeAxisMarker>` — marks on the time axis: the time under the
 * pointer (`builder.hoverIndicator`), or a range as `start ─ duration ─
 * end` (a selection being dragged, the host's draft).
 *
 * Vertical grid: inside the hour axis column, pills right-aligned at
 * their y. Horizontal grid: inside the hour header, pills centred on
 * their x. A range too short for two pills collapses into one
 * (`12:00–12:30 · 30 min`).
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed } from 'vue';
import type { TimeAxisMark } from '../../../composables/useTimeGridOverlays';

const props = defineProps<{
  orientation: 'vertical' | 'horizontal';
  mark: TimeAxisMark;
}>();

/** Below this extent (px) along the axis, a range shows one combined pill. */
const SPLIT_MIN_PX = { vertical: 44, horizontal: 120 } as const;

const split = computed(
  () =>
    props.mark.type === 'range' &&
    props.mark.endPx - props.mark.startPx >= SPLIT_MIN_PX[props.orientation],
);

function at(px: number): Record<string, string> {
  return props.orientation === 'horizontal' ? { left: px + 'px' } : { top: px + 'px' };
}
function span(from: number, to: number): Record<string, string> {
  return props.orientation === 'horizontal'
    ? { left: from + 'px', width: Math.max(0, to - from) + 'px' }
    : { top: from + 'px', height: Math.max(0, to - from) + 'px' };
}
</script>

<template>
  <div
    class="coar-time-axis-marker"
    :class="[
      `coar-time-axis-marker--${orientation}`,
      mark.type === 'range' ? `coar-time-axis-marker--${mark.tone}` : 'coar-time-axis-marker--time',
    ]"
    data-time-axis-marker
    aria-hidden="true"
  >
    <span v-if="mark.type === 'time'" class="coar-time-axis-marker__pill" :style="at(mark.px)">
      {{ mark.label }}
    </span>
    <template v-else-if="split">
      <span class="coar-time-axis-marker__span" :style="span(mark.startPx, mark.endPx)">
        <span class="coar-time-axis-marker__duration">{{ mark.durationLabel }}</span>
      </span>
      <span
        class="coar-time-axis-marker__pill coar-time-axis-marker__pill--start"
        :style="at(mark.startPx)"
      >
        {{ mark.startLabel }}
      </span>
      <span
        class="coar-time-axis-marker__pill coar-time-axis-marker__pill--end"
        :style="at(mark.endPx)"
      >
        {{ mark.endLabel }}
      </span>
    </template>
    <span v-else class="coar-time-axis-marker__pill" :style="at(mark.startPx)">
      {{ mark.startLabel }}–{{ mark.endLabel }} · {{ mark.durationLabel }}
    </span>
  </div>
</template>

<style scoped>
.coar-time-axis-marker {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  --marker-color: var(--coar-background-accent-primary, #2563eb);
}
.coar-time-axis-marker--draft {
  --marker-color: var(--coar-calendar-draft-color, var(--coar-background-accent-primary, #2563eb));
}
.coar-time-axis-marker__pill {
  position: absolute;
  padding: 1px 5px;
  border-radius: 9px;
  background: var(--marker-color);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 14px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.coar-time-axis-marker--vertical .coar-time-axis-marker__pill {
  right: 4px;
  transform: translateY(-50%);
}
.coar-time-axis-marker--horizontal .coar-time-axis-marker__pill {
  bottom: 5px;
  transform: translateX(-50%);
}
/* Keep start and end pills inside the span's ends. */
.coar-time-axis-marker--horizontal .coar-time-axis-marker__pill--start {
  transform: translateX(-2px);
}
.coar-time-axis-marker--horizontal .coar-time-axis-marker__pill--end {
  transform: translateX(calc(-100% + 2px));
}
.coar-time-axis-marker--vertical .coar-time-axis-marker__pill--start {
  transform: translateY(-2px);
}
.coar-time-axis-marker--vertical .coar-time-axis-marker__pill--end {
  transform: translateY(calc(-100% + 2px));
}
/* The line between the pills, with the duration in its middle. */
.coar-time-axis-marker__span {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}
.coar-time-axis-marker--horizontal .coar-time-axis-marker__span {
  bottom: 12px;
  height: 0;
  border-top: 1px solid var(--marker-color);
}
.coar-time-axis-marker--vertical .coar-time-axis-marker__span {
  right: 14px;
  width: 0;
  border-left: 1px solid var(--marker-color);
}
.coar-time-axis-marker__duration {
  padding: 0 4px;
  background: var(--coar-calendar-bg, #fff);
  color: var(--marker-color);
  font-size: 10px;
  font-weight: 600;
  line-height: 12px;
  white-space: nowrap;
}
.coar-time-axis-marker--vertical .coar-time-axis-marker__duration {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  padding: 4px 0;
}
</style>
